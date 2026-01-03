import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import logoImage from "@assets/Untitled_design_1767458803119.png";

interface HeaderProps {
  isOnline: boolean;
}

export function Header({ isOnline }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1" />
          
          <div className="flex flex-col items-center">
            <img 
              src={logoImage} 
              alt="مركز اضواء الساير للعلاج الطبيعي والمساند الطبية" 
              className="h-24 sm:h-28 md:h-32 w-auto object-contain"
              data-testid="img-logo"
            />
            <Badge 
              variant={isOnline ? "default" : "secondary"}
              className="text-xs mt-1"
              data-testid="badge-connection-status"
            >
              {isOnline ? "متصل" : "غير متصل"}
            </Badge>
          </div>
          
          <div className="flex-1 flex justify-end">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
