import { useState } from 'react';
import { Link } from 'wouter';
import { 
  LayoutDashboard, 
  Upload, 
  Sparkles, 
  FileText, 
  Map, 
  MessageSquare, 
  Menu, 
  X,
  Layers,
  Zap,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  section?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: '/', section: 'OVERVIEW' },
  
  { label: 'Feedback Ingestion', icon: <Upload className="w-5 h-5" />, href: '/feedback', section: 'DATA INGESTION' },
  { label: 'Product Analytics', icon: <Zap className="w-5 h-5" />, href: '/analytics' },
  
  { label: 'Theme Extraction', icon: <Layers className="w-5 h-5" />, href: '/themes', section: 'AI ANALYSIS' },
  { label: 'Feature Requests', icon: <Sparkles className="w-5 h-5" />, href: '/features', badge: 'PRO' },
  { label: 'Prioritization', icon: <ChevronDown className="w-5 h-5" />, href: '/prioritization' },
  
  { label: 'PRD Generator', icon: <FileText className="w-5 h-5" />, href: '/prd', section: 'GENERATE' },
  { label: 'Roadmap', icon: <Map className="w-5 h-5" />, href: '/roadmap' },
  
  { label: 'Ask Copilot', icon: <MessageSquare className="w-5 h-5" />, href: '/chat', section: 'ASSISTANT' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');

  const handleNavClick = (href: string) => {
    setCurrentPath(href);
    setIsOpen(false);
  };

  const groupedItems = navItems.reduce((acc, item) => {
    if (item.section) {
      if (!acc[item.section]) {
        acc[item.section] = [];
      }
    }
    acc[item.section || 'default'] = [...(acc[item.section || 'default'] || []), item];
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-card border-border"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 z-40',
          'lg:translate-x-0 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <span className="text-white font-bold text-lg">PM</span>
            </div>
            <div>
              <h2 className="font-bold text-foreground">Copilot</h2>
              <p className="text-xs text-muted-foreground">AI Product Manager</p>
            </div>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="px-4 py-4 border-b border-sidebar-border">
          <Button 
            variant="outline" 
            className="w-full justify-between bg-secondary/50 border-sidebar-border hover:bg-secondary"
          >
            <span className="text-sm font-medium">BarkApp Pro</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section}>
              {section !== 'default' && (
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-3">
                  {section}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      'text-sm font-medium',
                      currentPath === item.href
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2 bg-secondary/30 border-sidebar-border hover:bg-secondary/50">
            <span className="w-2 h-2 rounded-full bg-chart-1"></span>
            <span className="text-sm">Pro Plan</span>
          </Button>
          <div className="text-xs text-muted-foreground px-2">
            <p className="font-medium text-foreground mb-1">Nishyanth</p>
            <p>Product Manager</p>
          </div>
          <Button 
            onClick={() => {
              localStorage.removeItem('user');
              localStorage.removeItem('twoFactorVerified');
              localStorage.removeItem('pendingUser');
              localStorage.removeItem('authStep');
              window.location.href = '/login';
            }}
            variant="destructive" 
            className="w-full mt-2"
          >
            Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
