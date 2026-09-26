import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
export function MainLayout() {
  return (<><Header /><main className="main-content" id="main-content"><Outlet /></main><Footer /></>);
}
