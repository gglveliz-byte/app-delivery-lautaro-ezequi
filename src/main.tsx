import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { CartProvider } from "@/hooks/useCart"
import { CustomerSessionProvider } from "@/hooks/useCustomerSession"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <CartProvider>
          <CustomerSessionProvider>
            <App />
          </CustomerSessionProvider>
        </CartProvider>
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
