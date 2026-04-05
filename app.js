const express = require('express');
const { Pool } = require('pg');

const app = express();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
async function probarConexion() {
    try {
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Conectado a PostgreSQL');
      console.log(result.rows[0]);
    } catch (error) {
      console.error('❌ Error de conexión:', error);
    }
  }

async function inicializarBase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clientes (
                id_cliente SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                apellido VARCHAR(100) NOT NULL,
                dpi VARCHAR(20) UNIQUE NOT NULL,
                nit VARCHAR(20),
                fecha_nacimiento DATE,
                direccion VARCHAR(200),
                telefono VARCHAR(20),
                correo VARCHAR(100)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id_rol SERIAL PRIMARY KEY,
                nombre_rol VARCHAR(50) NOT NULL UNIQUE
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id_usuario SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(200) NOT NULL,
                estado BOOLEAN NOT NULL DEFAULT true,
                id_cliente INT NULL REFERENCES clientes(id_cliente)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuario_rol (
                id_usuario_rol SERIAL PRIMARY KEY,
                id_usuario INT NOT NULL REFERENCES usuarios(id_usuario),
                id_rol INT NOT NULL REFERENCES roles(id_rol)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS tipos_cuenta (
                id_tipo_cuenta SERIAL PRIMARY KEY,
                nombre_tipo VARCHAR(50) NOT NULL UNIQUE
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS cuentas (
                id_cuenta SERIAL PRIMARY KEY,
                id_cliente INT NOT NULL REFERENCES clientes(id_cliente),
                id_tipo_cuenta INT NOT NULL REFERENCES tipos_cuenta(id_tipo_cuenta),
                numero_cuenta VARCHAR(50) NOT NULL UNIQUE,
                saldo NUMERIC(10,2) NOT NULL,
                fecha_apertura DATE,
                estado VARCHAR(20)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS tipos_prestamo (
                id_tipo_prestamo SERIAL PRIMARY KEY,
                nombre_tipo VARCHAR(50) NOT NULL UNIQUE,
                tasa_interes NUMERIC(5,2) NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS prestamos (
                id_prestamo SERIAL PRIMARY KEY,
                id_cliente INT NOT NULL REFERENCES clientes(id_cliente),
                id_tipo_prestamo INT NOT NULL REFERENCES tipos_prestamo(id_tipo_prestamo),
                monto NUMERIC(10,2) NOT NULL,
                plazo_meses INT NOT NULL,
                saldo_pendiente NUMERIC(10,2) NOT NULL,
                fecha_inicio DATE,
                fecha_fin DATE,
                estado VARCHAR(20)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS pagos (
                id_pago SERIAL PRIMARY KEY,
                id_prestamo INT NOT NULL REFERENCES prestamos(id_prestamo),
                fecha_pago DATE,
                monto_pagado NUMERIC(10,2) NOT NULL,
                mora NUMERIC(10,2) NOT NULL,
                saldo_restante NUMERIC(10,2) NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS solicitudes_credito (
                id_solicitud_credito SERIAL PRIMARY KEY,
                id_cliente INT NOT NULL REFERENCES clientes(id_cliente),
                monto_solicitado NUMERIC(10,2) NOT NULL,
                plazo_meses INT NOT NULL,
                fecha_solicitud DATE,
                estado VARCHAR(20)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS solicitudes_cuenta (
                id_solicitud_cuenta SERIAL PRIMARY KEY,
                id_cliente INT NOT NULL REFERENCES clientes(id_cliente),
                id_tipo_cuenta INT NOT NULL REFERENCES tipos_cuenta(id_tipo_cuenta),
                fecha_solicitud DATE,
                estado VARCHAR(20)
            );
        `);

        await pool.query(`
            INSERT INTO roles (nombre_rol)
            VALUES ('Cliente'), ('Colaborador'), ('Administrador')
            ON CONFLICT (nombre_rol) DO NOTHING;
        `);

        await pool.query(`
            INSERT INTO tipos_cuenta (nombre_tipo)
            VALUES ('Ahorro'), ('Monetaria')
            ON CONFLICT (nombre_tipo) DO NOTHING;
        `);

        await pool.query(`
            INSERT INTO tipos_prestamo (nombre_tipo, tasa_interes)
            VALUES 
                ('Personal', 12.50),
                ('Hipotecario', 8.75),
                ('Vehicular', 10.25)
            ON CONFLICT (nombre_tipo) DO NOTHING;
        `);

        await pool.query(`
            INSERT INTO clientes (nombre, apellido, dpi, nit, fecha_nacimiento, direccion, telefono, correo)
            VALUES
                ('Juan', 'Perez', '1234567890101', '1234567-8', '1990-05-15', 'Ciudad de Guatemala', '5555-1111', 'juan.perez@gmail.com'),
                ('Maria', 'Lopez', '2345678901202', '2345678-9', '1988-08-20', 'Mixco, Guatemala', '5555-2222', 'maria.lopez@gmail.com'),
                ('Carlos', 'Ramirez', '3456789012303', '3456789-0', '1995-02-10', 'Villa Nueva, Guatemala', '5555-3333', 'carlos.ramirez@gmail.com')
            ON CONFLICT (dpi) DO NOTHING;
        `);

        await pool.query(`
            INSERT INTO usuarios (username, password_hash, estado, id_cliente)
            VALUES
                ('juanp', 'Juan123*', true, 1),
                ('marial', 'Maria123*', true, 2),
                ('colaborador1', 'Colab123*', true, NULL),
                ('admin1', 'Admin123*', true, NULL)
            ON CONFLICT (username) DO NOTHING;
        `);

        await pool.query(`
            INSERT INTO usuario_rol (id_usuario, id_rol)
            SELECT 1, 1
            WHERE NOT EXISTS (
                SELECT 1 FROM usuario_rol WHERE id_usuario = 1 AND id_rol = 1
            );
        `);

        await pool.query(`
            INSERT INTO usuario_rol (id_usuario, id_rol)
            SELECT 2, 1
            WHERE NOT EXISTS (
                SELECT 1 FROM usuario_rol WHERE id_usuario = 2 AND id_rol = 1
            );
        `);

        await pool.query(`
            INSERT INTO usuario_rol (id_usuario, id_rol)
            SELECT 3, 2
            WHERE NOT EXISTS (
                SELECT 1 FROM usuario_rol WHERE id_usuario = 3 AND id_rol = 2
            );
        `);

        await pool.query(`
            INSERT INTO usuario_rol (id_usuario, id_rol)
            SELECT 4, 3
            WHERE NOT EXISTS (
                SELECT 1 FROM usuario_rol WHERE id_usuario = 4 AND id_rol = 3
            );
        `);

        await pool.query(`
            INSERT INTO cuentas (id_cliente, id_tipo_cuenta, numero_cuenta, saldo, fecha_apertura, estado)
            VALUES
                (1, 1, 'AHO-1001', 3500.00, '2024-01-10', 'Activa'),
                (1, 2, 'MON-1001', 1200.00, '2024-02-15', 'Activa'),
                (2, 1, 'AHO-1002', 5000.00, '2024-03-01', 'Activa'),
                (3, 2, 'MON-1002', 2750.00, '2024-03-20', 'Activa')
            ON CONFLICT (numero_cuenta) DO NOTHING;
        `);

        await pool.query(`
            INSERT INTO prestamos (id_cliente, id_tipo_prestamo, monto, plazo_meses, saldo_pendiente, fecha_inicio, fecha_fin, estado)
            VALUES
                (1, 1, 10000.00, 24, 7800.00, '2024-01-01', '2025-12-31', 'Activo'),
                (2, 2, 85000.00, 120, 79000.00, '2023-06-01', '2033-05-31', 'Activo'),
                (3, 3, 25000.00, 36, 18000.00, '2024-04-01', '2027-03-31', 'Activo')
            ON CONFLICT DO NOTHING;
        `);

        console.log('Base PostgreSQL inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la base:', error);
    }
}

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE username = $1 AND estado = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.send('Usuario no encontrado');
    }

    const usuario = result.rows[0];

    // 🔥 TEMPORAL (sin validar hash para que funcione ya)
    // luego lo mejoramos si hay tiempo

    if (usuario.id_cliente) {
      // cliente
      return res.redirect(`/cliente/${usuario.id_cliente}`);
    } else {
      // colaborador
      return res.redirect('/colaborador');
    }

  } catch (error) {
    console.error(error);
    res.send('Error en login');
  }
});

app.get('/colaborador', (req, res) => {
    res.render('colaborador');
});

app.get('/cliente', (req, res) => {
    res.redirect('/cliente/1');
  }); 

app.get('/cliente/:id', async (req, res) => {
    const idCliente = req.params.id;

    try {
        const cuentasResult = await pool.query(
            `
            SELECT DISTINCT c.numero_cuenta, c.saldo, tc.nombre_tipo
            FROM cuentas c
            INNER JOIN tipos_cuenta tc ON c.id_tipo_cuenta = tc.id_tipo_cuenta
            WHERE c.id_cliente = $1
            `,
            [idCliente]
        );

        const prestamosResult = await pool.query(`
            SELECT DISTINCT p.monto, p.saldo_pendiente, tp.nombre_tipo
            FROM prestamos p
            INNER JOIN tipos_prestamo tp ON p.id_tipo_prestamo = tp.id_tipo_prestamo
            WHERE p.id_cliente = $1
          `, [idCliente]);
          
          const pagosResult = await pool.query(`
            SELECT 
              p.id_pago,
              p.fecha_pago,
              p.monto_pagado,
              p.mora,
              p.saldo_restante,
              pr.id_prestamo
            FROM pagos p
            INNER JOIN prestamos pr ON p.id_prestamo = pr.id_prestamo
            WHERE pr.id_cliente = $1
            ORDER BY p.fecha_pago DESC
          `, [idCliente]);

        res.render('cliente', {
            cuentas: cuentasResult.rows,
            prestamos: prestamosResult.rows,
            pagos: pagosResult.rows
          });
    } catch (error) {
        console.error(error);
        res.send('Error al cargar cliente');
    }
});

app.get('/test-db', async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW()');
      res.json({
        ok: true,
        serverTime: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Error en /test-db:', error);
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  app.get('/ver-tablas', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
  
      res.json(result.rows);
    } catch (error) {
      console.error('❌ Error en /ver-tablas:', error);
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });
  app.get('/estructura/:tabla', async (req, res) => {
    const { tabla } = req.params;
  
    try {
      const result = await pool.query(
        `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
        `,
        [tabla]
      );
  
      res.json(result.rows);
    } catch (error) {
      console.error('Error al consultar estructura:', error);
      res.status(500).json({ error: error.message });
    }
  });
  app.get('/solicitar-credito/:id', (req, res) => {
    const idCliente = req.params.id;
    res.render('solicitar_credito', { idCliente });
  });
  app.post('/solicitar-credito', async (req, res) => {
    const { id_cliente, monto, plazo_meses, id_tipo_prestamo } = req.body;
  
    try {
        await pool.query(`
            INSERT INTO prestamos (
              id_cliente,
              id_tipo_prestamo,
              monto,
              plazo_meses,
              saldo_pendiente,
              fecha_inicio,
              fecha_fin,
              estado
            )
            VALUES (
              $1,
              $2,
              $3,
              $4::integer,
              $3,
              CURRENT_DATE,
              CURRENT_DATE + (($4::integer) * INTERVAL '1 month'),
              'pendiente'
            )
          `, [id_cliente, id_tipo_prestamo, monto, plazo_meses]);
  
          res.redirect('/cliente/' + id_cliente);
  
    } catch (error) {
      console.error('ERROR REAL AL GUARDAR SOLICITUD:', error);
      res.send('Error al guardar solicitud');
    }
  });
  app.get('/solicitar-cuenta/:id', (req, res) => {
    const idCliente = req.params.id;
    res.render('solicitar_cuenta', { idCliente });
  });
  app.post('/solicitar-cuenta', async (req, res) => {
    const { id_cliente, id_tipo_cuenta } = req.body;
  
    try {
      await pool.query(`
        INSERT INTO solicitudes_cuenta (
          id_cliente,
          id_tipo_cuenta,
          fecha_solicitud,
          estado
        )
        VALUES ($1, $2, CURRENT_DATE, 'pendiente')
      `, [id_cliente, id_tipo_cuenta]);
  
      res.redirect('/cliente/' + id_cliente);
  
    } catch (error) {
      console.error('ERROR AL GUARDAR SOLICITUD DE CUENTA:', error);
      res.send('Error al guardar solicitud de cuenta');
    }
  });
const PORT = process.env.PORT || 3000;
app.post('/buscar-cliente', async (req, res) => {
  const { id_cliente } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE id_cliente = $1',
      [id_cliente]
    );

    if (result.rows.length === 0) {
      return res.send('Cliente no encontrado');
    }

    const cliente = result.rows[0];
    res.render('ver_cliente', { cliente });

  } catch (error) {
    console.error('ERROR AL BUSCAR CLIENTE:', error);
    res.status(500).send('Error interno al buscar cliente');
  }
});
  app.get('/colaborador/cuentas/:id', async (req, res) => {
    const id_cliente = req.params.id;
  
    try {
      const result = await pool.query(`
        SELECT c.numero_cuenta, tc.nombre_tipo, c.saldo
        FROM cuentas c
        INNER JOIN tipos_cuenta tc ON c.id_tipo_cuenta = tc.id_tipo_cuenta
        WHERE c.id_cliente = $1
      `, [id_cliente]);
  
      res.render('cuentas_cliente', { cuentas: result.rows });
  
    } catch (error) {
      console.error('ERROR AL OBTENER CUENTAS:', error);
      res.send('Error al obtener cuentas');
    }
  });
  app.get('/colaborador/pagos-por-vencer', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          c.id_cliente,
          c.nombre,
          c.apellido,
          p.id_prestamo,
          p.monto,
          p.saldo_pendiente,
          p.fecha_fin,
          tp.nombre_tipo
        FROM prestamos p
        INNER JOIN clientes c ON p.id_cliente = c.id_cliente
        INNER JOIN tipos_prestamo tp ON p.id_tipo_prestamo = tp.id_tipo_prestamo
        WHERE p.saldo_pendiente > 0
          AND p.fecha_fin >= CURRENT_DATE
          AND p.fecha_fin <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY p.fecha_fin ASC
      `);
  
      res.render('pagos_por_vencer', { prestamos: result.rows });
  
    } catch (error) {
      console.error('ERROR AL OBTENER PAGOS POR VENCER:', error);
      res.send('Error al obtener pagos por vencer');
    }
  });
  app.get('/colaborador/prestamos/:id', async (req, res) => {
    const id_cliente = req.params.id;
  
    try {
      const result = await pool.query(`
        SELECT p.id_prestamo, tp.nombre_tipo, p.monto, p.saldo_pendiente, p.fecha_inicio, p.fecha_fin
        FROM prestamos p
        INNER JOIN tipos_prestamo tp ON p.id_tipo_prestamo = tp.id_tipo_prestamo
        WHERE p.id_cliente = $1
      `, [id_cliente]);
  
      res.render('prestamos_cliente', { prestamos: result.rows });
  
    } catch (error) {
      console.error('ERROR AL OBTENER PRESTAMOS:', error);
      res.send('Error al obtener préstamos');
    }
  });
  app.post('/colaborador/pagar', async (req, res) => {
    const { id_prestamo, monto_pago } = req.body;
  
    try {
      const prestamoResult = await pool.query(
        'SELECT saldo_pendiente FROM prestamos WHERE id_prestamo = $1',
        [id_prestamo]
      );
  
      if (prestamoResult.rows.length === 0) {
        return res.send('Préstamo no encontrado');
      }
  
      const saldoActual = Number(prestamoResult.rows[0].saldo_pendiente);
      const montoPagado = Number(monto_pago);
      const nuevoSaldo = saldoActual - montoPagado;
  
      await pool.query(`
        INSERT INTO pagos (
          id_prestamo,
          fecha_pago,
          monto_pagado,
          mora,
          saldo_restante
        )
        VALUES ($1, CURRENT_DATE, $2, 0, $3)
      `, [id_prestamo, montoPagado, nuevoSaldo]);
  
      await pool.query(`
        UPDATE prestamos
        SET saldo_pendiente = $1
        WHERE id_prestamo = $2
      `, [nuevoSaldo, id_prestamo]);
  
      res.send('Pago realizado correctamente');
  
    } catch (error) {
      console.error('ERROR AL PAGAR:', error);
      res.send('Error al realizar pago');
    }
  });
  app.get('/colaborador/pagos/:id', async (req, res) => {
    const id_prestamo = req.params.id;
  
    try {
      const result = await pool.query(`
        SELECT monto_pagado, fecha_pago, mora, saldo_restante
        FROM pagos
        WHERE id_prestamo = $1
        ORDER BY fecha_pago DESC
      `, [id_prestamo]);
  
      res.render('pagos_cliente', { pagos: result.rows });
  
    } catch (error) {
      console.error('ERROR AL OBTENER PAGOS:', error);
      res.send('Error al obtener pagos');
    }
  }); 
  app.get('/crear-colaborador', async (req, res) => {
    try {
      await pool.query(`
        INSERT INTO usuarios (username, password_hash, estado, id_cliente)
        VALUES ('colaborador', '1234', true, NULL)
      `);
  
      res.send('Usuario colaborador creado');
    } catch (error) {
      console.error(error);
      res.send('Error creando colaborador');
    }
  });
app.listen(PORT, async () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  await probarConexion();
  await inicializarBase();
});