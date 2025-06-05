import { Button } from "@/components/ui/button";
import { Menu, Bell, Calendar } from "lucide-react";
import { auth } from "@/lib/firebase"; // 1. Importe aqui

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden mr-2"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{currentDate}</span>
          </div>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5 text-gray-400" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-danger rounded-full"></span>
          </Button>
          
          {/* BOTÃO DE SAIR: */}
          <Button
            variant="outline" // ou "ghost", seu gosto
            size="sm"
            onClick={() => auth.signOut()}
            className="ml-2"
          >
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}