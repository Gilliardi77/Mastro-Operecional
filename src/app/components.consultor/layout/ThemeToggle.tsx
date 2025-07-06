"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle({ inMenu = false }: { inMenu?: boolean }) {
  const { setTheme, theme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  if (inMenu) {
    return (
      <DropdownMenuItem onClick={toggleTheme}>
        {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
        <span>{theme === "light" ? "Modo Escuro" : "Modo Claro"}</span>
      </DropdownMenuItem>
    )
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
