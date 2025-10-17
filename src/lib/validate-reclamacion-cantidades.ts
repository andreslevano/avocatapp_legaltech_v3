import { z } from 'zod';

export const ReclamacionCantidadesRequestSchema = z.object({
  nombreTrabajador: z.string().min(1, 'Nombre del trabajador es requerido'),
  dniTrabajador: z.string().min(1, 'DNI del trabajador es requerido'),
  domicilioTrabajador: z.string().min(1, 'Domicilio del trabajador es requerido'),
  telefonoTrabajador: z.string().min(1, 'Teléfono del trabajador es requerido'),
  nombreEmpresa: z.string().min(1, 'Nombre de la empresa es requerido'),
  cifEmpresa: z.string().min(1, 'CIF de la empresa es requerido'),
  domicilioEmpresa: z.string().min(1, 'Domicilio de la empresa es requerido'),
  tipoContrato: z.string().optional(),
  jornada: z.string().optional(),
  tareas: z.string().optional(),
  antiguedad: z.string().optional(),
  salario: z.string().optional(),
  convenio: z.string().optional(),
  cantidadesAdeudadas: z.array(z.string()).optional(),
  fechaPapeleta: z.string().optional(),
  fechaConciliacion: z.string().optional(),
  resultadoConciliacion: z.string().optional(),
  cantidadTotal: z.string().optional(),
  localidad: z.string().optional(),
  userId: z.string().optional()
});

export const ReclamacionCantidadesModelSchema = z.object({
  encabezado: z.object({
    juzgado: z.string(),
    localidad: z.string()
  }),
  demandante: z.object({
    nombre: z.string(),
    dni: z.string(),
    domicilio: z.string(),
    telefono: z.string()
  }),
  demandada: z.object({
    nombre: z.string(),
    cif: z.string(),
    domicilio: z.string()
  }),
  hechos: z.object({
    primer: z.object({
      tipoContrato: z.string(),
      jornada: z.string(),
      coeficienteParcialidad: z.string(),
      tareas: z.string(),
      antiguedad: z.string(),
      duracion: z.string(),
      salario: z.string(),
      convenio: z.string()
    }),
    segundo: z.object({
      cantidadesAdeudadas: z.array(z.string()),
      interesDemora: z.boolean()
    }),
    tercer: z.object({
      cargoSindical: z.boolean()
    }),
    cuarto: z.object({
      fechaPapeleta: z.string(),
      fechaConciliacion: z.string(),
      resultado: z.string()
    })
  }),
  fundamentos: z.object({
    primero: z.string(),
    segundo: z.string(),
    tercero: z.string(),
    cuarto: z.string()
  }),
  petitorio: z.object({
    cantidadReclamada: z.string(),
    intereses: z.boolean(),
    lugar: z.string(),
    fecha: z.string()
  }),
  otrosi: z.object({
    asistenciaLetrada: z.boolean(),
    mediosPrueba: z.object({
      documental: z.array(z.string()),
      interrogatorio: z.string()
    })
  })
});

export type ReclamacionCantidadesRequest = z.infer<typeof ReclamacionCantidadesRequestSchema>;
export type ReclamacionCantidadesModel = z.infer<typeof ReclamacionCantidadesModelSchema>;


