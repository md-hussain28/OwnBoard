// biome-ignore lint/performance/noBarrelFile: intentional public API for the shadcn sidebar primitive, split across files but consumed as `@/ui/sidebar`.
export { SidebarProvider, useSidebar } from "./context";
export {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./menu";
export { Sidebar, SidebarInput, SidebarInset, SidebarRail, SidebarTrigger } from "./sidebar";
export {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
} from "./structure";
