
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, FileText, Users, ShoppingCart, Truck, Ticket, User, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user } = useAuth();
    const router = useRouter();

    const mainLinks = [
        { href: "/admin", label: "Dashboard", icon: Home, exact: true },
        { href: "/admin/projects", label: "Proyectos", icon: Briefcase },
    ];
    
    const salesLinks = [
        { href: "/admin/quotes", label: "Cotizaciones", icon: FileText },
        { href: "/admin/clients", label: "Clientes", icon: Users },
    ];
    
    const purchasesLinks = [
        { href: "/admin/purchase-orders", label: "Órdenes de Compra", icon: ShoppingCart },
        { href: "/admin/suppliers", label: "Proveedores", icon: Truck },
    ];

    const operationsLinks = [
        { href: "/admin/tickets", label: "Tickets de Servicio", icon: Ticket },
    ];

    const adminControlLink = { href: "/admin/users", label: "Control de Usuarios", icon: User };

    const handleSignOut = async () => {
        await auth.signOut();
        router.push('/');
    };

    const isActive = (href: string, exact = false) => {
        if (exact) {
            return pathname === href;
        }
        return pathname.startsWith(href);
    }

    const NavLink = ({ link, isMobile = false }: { link: { href: string, label: string, icon: React.ElementType, exact?: boolean }, isMobile?: boolean}) => (
         <Link
            href={link.href}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                isActive(link.href, link.exact) ? "bg-muted text-primary" : "text-muted-foreground",
                 isMobile && `gap-4 rounded-xl text-foreground hover:text-foreground mx-[-0.65rem] ${isActive(link.href, link.exact) ? "bg-muted" : ""}`
            )}
        >
            <link.icon className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
            {link.label}
        </Link>
    );

    const NavGroup = ({ title, links, isMobile = false }: { title: string, links: any[], isMobile?: boolean }) => (
        <div className="py-2">
            {!isMobile && <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>}
            {links.map((link) => <NavLink key={link.href} link={link} isMobile={isMobile} />)}
        </div>
    );
    

  return (
    <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Logo href="/admin" />
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {mainLinks.map((link) => <NavLink key={link.href} link={link} />)}
              <NavGroup title="Ventas" links={salesLinks} />
              <NavGroup title="Compras" links={purchasesLinks} />
              <NavGroup title="Operaciones" links={operationsLinks} />
            </nav>
          </div>
            <div className="mt-auto p-4">
                 <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    <NavLink link={adminControlLink} />
                </nav>
            </div>
        </div>
      </div>
      <div className="flex flex-col h-screen overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 shrink-0">
            <Sheet>
                <SheetTrigger asChild>
                    <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 md:hidden"
                    >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <Logo href="/admin" />
                    </div>
                    <nav className="grid gap-2 text-lg font-medium p-4">
                        {[...mainLinks, ...salesLinks, ...purchasesLinks, ...operationsLinks, adminControlLink].map((link) => <NavLink key={link.href} link={link} isMobile={true} />)}
                    </nav>
                </SheetContent>
            </Sheet>
            <div className="w-full flex-1">
                {/* Optional: Add a search bar or other header content here */}
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                       <AvatarFallback>
                           <User className="h-5 w-5" />
                       </AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Toggle user menu</span>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>Perfil</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
