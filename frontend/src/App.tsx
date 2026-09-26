import Home from './Home/Home';
import CustomerProvider from './auth/CustomerProvider';
import RegistrationNotice from './auth/RegistrationNotice';

function App() {
  return (
    <CustomerProvider>
      <Home />
      <RegistrationNotice />
    </CustomerProvider>
  );
}

export default App;
