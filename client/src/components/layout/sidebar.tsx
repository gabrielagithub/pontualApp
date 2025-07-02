import { Link, useLocation } from "wouter";
import { Clock, BarChart3, Timer, ListTodo, History, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Atividades", href: "/tasks", icon: ListTodo },
  { name: "Controle de Tempo", href: "/timer", icon: Timer },
  { name: "Relatórios", href: "/reports", icon: BarChart3 },
  { name: "Histórico", href: "/history", icon: History },
  { name: "WhatsApp", href: "/whatsapp", icon: Smartphone },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-center h-16 bg-primary">
          <h1 className="text-white text-xl font-bold">
            <Clock className="inline-block mr-2 h-6 w-6" />
            Pontual
          </h1>
        </div>

        {/* Navigation */}
        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href || 
                (item.href === "/" && location === "/dashboard");
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => onClose()}
                  className={cn(
                    "flex items-center px-4 py-3 text-gray-700 rounded-lg transition-colors duration-200",
                    "hover:bg-gray-100",
                    isActive && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
