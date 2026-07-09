"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { UtensilsCrossed, Sparkles, ChefHat, Calendar, User, Menu, X, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "./ui/button";

export const Navbar = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [mounted, setMounted] = React.useState(false);

  // Keep dark/light theme toggle in sync with system/HTML element
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initialTheme = savedTheme || systemTheme;
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setTimeout(() => {
      setTheme(initialTheme);
      setMounted(true);
    }, 0);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const navLinks = [
    { href: "/recipes", label: "Browse Recipes", icon: UtensilsCrossed },
    { href: "/generator", label: "AI Generator", icon: Sparkles, highlight: true },
    { href: "/chat", label: "AI Chef Chat", icon: ChefHat },
    { href: "/planner", label: "Meal Planner", icon: Calendar },
  ];

  const isActive = (href: string) => pathname === href;

  // Handles simulated or actual user session data
  const user = session?.user || (mounted && typeof window !== "undefined" && localStorage.getItem("mock_user") ? JSON.parse(localStorage.getItem("mock_user")!) : null);
  const isAuth = mounted && (status === "authenticated" || !!user);

  const handleLogout = () => {
    localStorage.removeItem("mock_user");
    if (session) {
      signOut({ callbackUrl: "/" });
    } else {
      window.location.href = "/";
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-zinc-150/80 bg-white/75 dark:border-zinc-800/80 dark:bg-zinc-950/75 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2.5 text-zinc-900 dark:text-zinc-50 font-sans font-bold text-xl group">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
                <ChefHat className="w-5.5 h-5.5" />
              </div>
              <span>GourmetAI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-brand-primary/10 text-brand-primary"
                      : link.highlight
                      ? "text-brand-primary hover:bg-brand-primary/5"
                      : "text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-350 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${link.highlight && !active ? "animate-pulse" : ""}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Action Utilities & User Auth */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {!mounted || theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {isAuth ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive("/dashboard")
                      ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-650 hover:bg-zinc-100 dark:text-zinc-350 dark:hover:bg-zinc-900"
                  }`}
                >
                  <User className="w-4.5 h-4.5" />
                  <span>Dashboard</span>
                </Link>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="primary" size="sm">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500"
            >
              {!mounted || theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-650 dark:text-zinc-350 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  active
                    ? "bg-brand-primary/10 text-brand-primary font-bold"
                    : "text-zinc-650 hover:bg-zinc-100 dark:text-zinc-350 dark:hover:bg-zinc-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
          
          <hr className="my-2 border-zinc-150 dark:border-zinc-800" />
          
          {isAuth ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  isActive("/dashboard")
                    ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900"
                    : "text-zinc-650 hover:bg-zinc-100 dark:text-zinc-350 dark:hover:bg-zinc-900"
                }`}
              >
                <User className="w-5 h-5" />
                Dashboard
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-left transition-all"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-2">
              <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">Sign In</Button>
              </Link>
              <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="sm" className="w-full">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
