import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import {
  SucursalDialog,
  CanalDialog,
  VendedorDialog,
  InversionistaDialog,
  EditarVendedorDialog,
  EditarSucursalDialog,
  EditarCanalDialog,
  EditarInversionistaDialog,
} from "@/features/catalogos/components/config-dialogs";
import { VendedorEliminarButton } from "@/features/catalogos/components/vendedor-eliminar-button";
import { SucursalEliminarButton } from "@/features/catalogos/components/sucursal-eliminar-button";
import { CanalEliminarButton } from "@/features/catalogos/components/canal-eliminar-button";
import { InversionistaEliminarButton } from "@/features/catalogos/components/inversionista-eliminar-button";

export const metadata = { title: "Configuración y Catálogos Auxiliares" };

export default async function ConfiguracionPage() {
  const supabase = await createClient();

  const [
    { data: sucursales },
    { data: canales },
    { data: vendedores },
    { data: perfiles },
    { data: inversionistas },
  ] = await Promise.all([
    supabase.from("sucursales").select("*").order("nombre"),
    supabase.from("canales_venta").select("*").order("nombre"),
    supabase.from("vendedores").select("*, perfiles(email, rol)").order("nombre"),
    supabase.from("perfiles").select("id, email, nombre").order("nombre"),
    supabase.from("inversionistas").select("*").order("nombre"),
  ]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Configuración y Catálogos Auxiliares</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administra sucursales, canales de venta, vendedores e inversionistas.
        </p>
      </div>

      {/* Vendedores */}
      <div className="space-y-3 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Vendedores</h2>
            <p className="text-xs text-muted-foreground">Administra el equipo de vendedores.</p>
          </div>
          <VendedorDialog perfiles={perfiles || []} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email / Perfil</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!vendedores?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No hay vendedores registrados.
                </TableCell>
              </TableRow>
            ) : (
              vendedores.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.nombre}</TableCell>
                  <TableCell>{v.perfiles?.email || v.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={v.activo ? "default" : "secondary"}>
                      {v.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditarVendedorDialog vendedor={v} perfiles={perfiles || []} />
                      <VendedorEliminarButton id={v.id} nombre={v.nombre} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sucursales */}
      <div className="space-y-3 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sucursales</h2>
            <p className="text-xs text-muted-foreground">Puntos de venta físicos o ferias.</p>
          </div>
          <SucursalDialog />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!sucursales?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No hay sucursales registradas.
                </TableCell>
              </TableRow>
            ) : (
              sucursales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell>{s.ciudad || "—"}</TableCell>
                  <TableCell>{s.direccion || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.activa ? "default" : "secondary"}>
                      {s.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditarSucursalDialog sucursal={s} />
                      <SucursalEliminarButton id={s.id} nombre={s.nombre} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Canales de Venta */}
      <div className="space-y-3 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Canales de Venta</h2>
            <p className="text-xs text-muted-foreground">Canales de origen de los pedidos (WhatsApp, Presencial, RRSS).</p>
          </div>
          <CanalDialog />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!canales?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No hay canales de venta registrados.
                </TableCell>
              </TableRow>
            ) : (
              canales.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{c.descripcion || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.activo ? "default" : "secondary"}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditarCanalDialog canal={c} />
                      <CanalEliminarButton id={c.id} nombre={c.nombre} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Inversionistas */}
      <div className="space-y-3 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Inversionistas y Socios</h2>
            <p className="text-xs text-muted-foreground">Personas que aportan capital para lotes o a quienes se efectúan retiros de capital y utilidad.</p>
          </div>
          <InversionistaDialog />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono / WhatsApp</TableHead>
              <TableHead>Correo electrónico</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!inversionistas?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No hay inversionistas registrados.
                </TableCell>
              </TableRow>
            ) : (
              inversionistas.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.nombre}</TableCell>
                  <TableCell>{inv.telefono || "—"}</TableCell>
                  <TableCell>{inv.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={inv.activo ? "default" : "secondary"}>
                      {inv.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditarInversionistaDialog inversionista={inv} />
                      <InversionistaEliminarButton id={inv.id} nombre={inv.nombre} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
