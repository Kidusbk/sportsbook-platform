import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Home } from './pages/Home'; import { Sports } from './pages/Sports'; import { Live } from './pages/Live';
import { Promotions } from './pages/Promotions'; import { Results } from './pages/Results';
import { Login } from './pages/Login'; import { Register } from './pages/Register';
import { Account } from './pages/Account'; import { Bets } from './pages/Bets'; import { Wallet } from './pages/Wallet';

export const router = createBrowserRouter([
  { element: <MainLayout />, children: [
    { path: '/', element: <Home /> }, { path: '/sports', element: <Sports /> }, { path: '/live', element: <Live /> },
    { path: '/promotions', element: <Promotions /> }, { path: '/results', element: <Results /> },
    { path: '/login', element: <Login /> }, { path: '/register', element: <Register /> },
    { path: '/account', element: <Account /> }, { path: '/bets', element: <Bets /> }, { path: '/wallet', element: <Wallet /> },
  ] },
]);
