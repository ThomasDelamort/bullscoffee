import Home from './Home/Home';
import CustomerProvider from './auth/CustomerProvider';
import RegistrationNotice from './auth/RegistrationNotice';
import Footer from './components/Footer';

function App() {
  return (
    <CustomerProvider>
      <Home />
      <RegistrationNotice />
      <Footer />
    </CustomerProvider>
  );
}

export default App;
