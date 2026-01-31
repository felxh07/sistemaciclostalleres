import { ToastContainer } from 'react-toastify';
import RegistrationForm from './components/RegistrationForm';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <>
      <RegistrationForm />
      <ToastContainer position="top-right" autoClose={5000} />
    </>
  )
}

export default App;
