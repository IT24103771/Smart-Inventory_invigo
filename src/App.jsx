import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Staff from "./pages/Staff";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import DiscountsPage from "./pages/DiscountsPage";
import InventoryPage from "./pages/InventoryPage";
import Products from "./pages/Products";
import NotificationsPage from "./pages/NotificationsPage";
import MailsAdminPage from "./pages/MailsAdminPage";

const queryClient = new QueryClient();
const App = () => (<QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />}/>
          <Route path="/login" element={<Login />}/>
          <Route path="/admin/*" element={<Admin />}/>
          <Route path="/staff/*" element={<Staff />}/>
          {/* CUSTOM ROUTES */}
          <Route path="/dashboard" element={<Dashboard />}/>
          <Route path="/discounts" element={<DiscountsPage />}/>
          <Route path="/inventory" element={<InventoryPage />}/>
          <Route path="/products" element={<Products />}/>
          <Route path="/notifications" element={<NotificationsPage />}/>
          <Route path="/mails" element={<MailsAdminPage />}/>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />}/>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>);
export default App;
