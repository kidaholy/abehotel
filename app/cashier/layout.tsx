import { MenuProvider } from "@/context/menu-context"
import { ReactNode } from "react"

export default function CashierLayout({ children }: { children: ReactNode }) {
  return (
    <MenuProvider>
      {children}
    </MenuProvider>
  )
}
