// INK-1572: the Inkwell Mini Site editor replaced the old builder/products/theme tabs.
import { redirect } from "react-router";

export function loader() {
  return redirect("/");
}
