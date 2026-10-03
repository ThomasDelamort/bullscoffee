import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { TicketList, TicketPriority, TicketReply, TicketStatus, TicketWithMessages } from "../types";
import { adminKeys } from "./keys";

/** Every ticket (or only open and in-progress ones), with open counts per kind. */
export function useTickets({ includeClosed = false }: { includeClosed?: boolean } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.ticketList(includeClosed),
    queryFn: () => api.get<TicketList>("/admin/tickets", { include_closed: includeClosed }),
  });
}

export function useTicket(ticketId: number | null) {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.ticket(ticketId ?? 0),
    queryFn: () => api.get<TicketWithMessages>(`/admin/tickets/${ticketId}`),
    enabled: ticketId !== null,
  });
}

function useRefreshTickets() {
  const queryClient = useQueryClient();
  return (ticket: TicketWithMessages) => {
    queryClient.setQueryData(adminKeys.ticket(ticket.id), ticket);
    void queryClient.invalidateQueries({ queryKey: adminKeys.tickets });
    void queryClient.invalidateQueries({ queryKey: adminKeys.activity });
  };
}

export function useUpdateTicket() {
  const api = useApi();
  const refresh = useRefreshTickets();
  return useMutation({
    mutationFn: ({ ticketId, changes }: { ticketId: number; changes: { status?: TicketStatus; priority?: TicketPriority } }) =>
      api.patch<TicketWithMessages>(`/admin/tickets/${ticketId}`, changes),
    onSuccess: refresh,
  });
}

/** Saves the reply and emails it to the reporter; the result says whether the email went. */
export function useReplyToTicket() {
  const api = useApi();
  const refresh = useRefreshTickets();
  return useMutation({
    mutationFn: ({ ticketId, body, resolve }: { ticketId: number; body: string; resolve: boolean }) =>
      api.post<TicketReply>(`/admin/tickets/${ticketId}/replies`, { body, resolve }),
    onSuccess: (reply) => refresh(reply.ticket),
  });
}
