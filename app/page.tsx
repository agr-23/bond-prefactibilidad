import { redirect } from "next/navigation";

// La herramienta vive ahora en /plataforma.
export default function Home() {
  redirect("/plataforma");
}
