import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "./navigation-menu";

export function Navbar() {
  return (
    <nav className="w-full bg-white border-b shadow-sm px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Logo */}
        <div className="w-8 h-8 bg-[#a87437] rounded-full flex items-center justify-center p-1">
          <img 
            src="/images/mau-removebg-preview.png" 
            alt="Mauricio's Cafe and Bakery Logo" 
            className="h-6 w-6 object-contain"
          />
        </div>
        <span className="text-xl font-bold tracking-tight text-[#a87437]">Mauricio's Cafe & Bakery</span>
      </div>
      <NavigationMenu className="flex-1 justify-end">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="/" className="px-4 py-2">Home</NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/about" className="px-4 py-2">About</NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/contact" className="px-4 py-2">Contact</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </nav>
  );
} 