import { useEffect } from 'react';
import About from './About/About';
import { sectionFromPath, setActiveSection } from './activeSection';
import Contact from './Contact/Contact';
import Hero from './Hero/Hero';
import Menu from './Menu/Menu';
import { NAV_LINKS, type NavId } from './Hero/hero.config';

export default function Home() {
  // Deep link / refresh / back-navigation: jump to the section named in the URL.
  useEffect(() => {
    const id = sectionFromPath(window.location.pathname);
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, []);

  // Scrollspy: a zero-height line across the middle of the viewport, so exactly
  // one section is "in view" at a time.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id as NavId);
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );

    for (const { id } of NAV_LINKS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <Hero />
      <Menu />
      <About />
      <Contact />
    </main>
  );
}
