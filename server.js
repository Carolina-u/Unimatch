const jwt = require("jsonwebtoken");
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const fileUpload = require('express-fileupload');


const app = express();
app.use(express.json());
app.use(cors());
app.use(fileUpload());

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "******",
    database: "Unimatch",
    waitForConnections: true,
    connectionLimit: 10
});

const SECRET_KEY = "unimatch_key";

// middleware para verificar token
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ mensaje: "Token requerido" });
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ mensaje: "Token inválido" });
        req.adminId = decoded.id;
        req.rolId = decoded.rol;
        next();
    });
};

// middleware para verificar si es superadmin (rol 1)
const verificarSuperAdmin = (req, res, next) => {
    if (req.rolId !== 1) {
        return res.status(403).json({ mensaje: "Acceso denegado. Se requieren permisos de superadmin." });
    }
    next();
};

/* AUTH*/
app.post("/api/login-admin", (req, res) => {
    const { correo, contrasena } = req.body;
    db.query("SELECT * FROM administrador WHERE correo = ? AND activo = 1", [correo], async (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ mensaje: "Error del servidor" });
        }
        if (result.length === 0) return res.status(401).json({ mensaje: "Usuario no encontrado o inactivo" });
        
        const admin = result[0];
        const valido = await bcrypt.compare(contrasena, admin.contrasena);
        if (!valido) return res.status(401).json({ mensaje: "Contraseña incorrecta" });
        
        const token = jwt.sign({ id: admin.id_administrador, rol: admin.id_rol }, SECRET_KEY, { expiresIn: "8h" });
        res.json({ 
            token, 
            rol: admin.id_rol, 
            nombre: admin.nombre,
            mensaje: "Login exitoso"
        });
    });
});

/* DATOS IMPORTANTES */
app.get("/api/estado-universidad", (req, res) => {
    db.query("SELECT * FROM estado_universidad", (err, resu) => {
        if (err) return res.status(500).json({ error: err });
        res.json(resu);
    });
});

app.get("/api/areas", (req, res) => {
    db.query("SELECT * FROM area_vocacional", (err, resu) => {
        if (err) return res.status(500).json({ error: err });
        res.json(resu);
    });
});

/*  CRUD UNIVERSIDADES  */
app.get("/api/universidades", (req, res) => {
    db.query(`
        SELECT u.*, e.nombre as estado_nombre 
        FROM universidad u 
        JOIN estado_universidad e ON u.id_estado = e.id_estado
        ORDER BY u.nombre
    `, (err, resu) => {
        if (err) return res.status(500).json({ error: err });
        res.json(resu);
    });
});

app.post("/api/admin/universidades", verificarToken, (req, res) => {
    const { nombre, ciudad, departamento, descripcion, sitio_web, id_estado } = req.body;
    
    if (!nombre || !ciudad || !departamento || !id_estado) {
        return res.status(400).json({ mensaje: "Faltan campos obligatorios" });
    }
    
    const sql = "INSERT INTO universidad (nombre, ciudad, departamento, descripcion, sitio_web, id_estado) VALUES (?,?,?,?,?,?)";
    db.query(sql, [nombre, ciudad, departamento, descripcion, sitio_web, id_estado], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ mensaje: "Error al crear universidad", error: err });
        }
        res.json({ mensaje: "Universidad creada exitosamente", id: result.insertId });
    });
});

app.put("/api/admin/universidades/:id", verificarToken, (req, res) => {
    const { nombre, ciudad, departamento, descripcion, sitio_web, id_estado } = req.body;
    const sql = "UPDATE universidad SET nombre=?, ciudad=?, departamento=?, descripcion=?, sitio_web=?, id_estado=? WHERE id_universidad=?";
    db.query(sql, [nombre, ciudad, departamento, descripcion, sitio_web, id_estado, req.params.id], (err) => {
        if (err) return res.status(500).json({ mensaje: "Error al actualizar", error: err });
        res.json({ mensaje: "Universidad actualizada exitosamente" });
    });
});

app.delete("/api/admin/universidades/:id", verificarToken, (req, res) => {
    // verificar si tiene carreras asociadas
    db.query("SELECT COUNT(*) as count FROM carrera WHERE id_universidad = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        if (result[0].count > 0) {
            return res.status(400).json({ mensaje: "No se puede eliminar la universidad porque tiene carreras asociadas" });
        }
        
        db.query("DELETE FROM universidad WHERE id_universidad=?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err });
            res.json({ mensaje: "Universidad eliminada exitosamente" });
        });
    });
});

/* =CRUD CARRERAS  */
app.get("/api/carreras", (req, res) => {
    db.query(`
        SELECT c.*, u.nombre as universidad_nombre, a.nombre as area_nombre 
        FROM carrera c 
        JOIN universidad u ON c.id_universidad = u.id_universidad 
        JOIN area_vocacional a ON c.id_area = a.id_area
        ORDER BY c.nombre
    `, (err, resu) => {
        if (err) return res.status(500).json({ error: err });
        res.json(resu);
    });
});

app.post("/api/admin/carreras", verificarToken, (req, res) => {
    const { nombre, descripcion, id_area, id_universidad } = req.body;
    
    if (!nombre || !id_area || !id_universidad) {
        return res.status(400).json({ mensaje: "Faltan campos obligatorios" });
    }
    
    db.query("INSERT INTO carrera (nombre, descripcion, id_area, id_universidad) VALUES (?,?,?,?)", 
        [nombre, descripcion, id_area, id_universidad], 
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ mensaje: "Error al crear carrera", error: err });
            }
            res.json({ mensaje: "Carrera creada exitosamente", id: result.insertId });
        }
    );
});

app.put("/api/admin/carreras/:id", verificarToken, (req, res) => {
    const { nombre, descripcion, id_area, id_universidad } = req.body;
    const sql = "UPDATE carrera SET nombre=?, descripcion=?, id_area=?, id_universidad=? WHERE id_carrera=?";
    db.query(sql, [nombre, descripcion, id_area, id_universidad, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ mensaje: "Carrera actualizada exitosamente" });
    });
});

app.delete("/api/admin/carreras/:id", verificarToken, (req, res) => {
    db.query("DELETE FROM carrera WHERE id_carrera=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ mensaje: "Carrera eliminada exitosamente" });
    });
});

/* == ESTADÍSTICAS DASHBOARD == */
app.get("/api/admin/stats-counts", verificarToken, (req, res) => {
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM universidad) as unis, 
            (SELECT COUNT(*) FROM carrera) as carreras, 
            (SELECT COUNT(*) FROM resultado_encuesta) as tests
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result[0]);
    });
});

app.get("/api/admin/stats-areas", verificarToken, (req, res) => {
    const sql = `
        SELECT a.nombre, a.id_area, COUNT(r.id_resultado) as total 
        FROM area_vocacional a 
        LEFT JOIN resultado_encuesta r ON a.id_area = r.id_area_resultado 
        GROUP BY a.id_area, a.nombre
        ORDER BY total DESC
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

app.get("/api/admin/stats-universidades", verificarToken, (req, res) => {
    const sql = `
        SELECT u.nombre, COUNT(c.id_carrera) as total_carreras
        FROM universidad u
        LEFT JOIN carrera c ON u.id_universidad = c.id_universidad
        GROUP BY u.id_universidad, u.nombre
        ORDER BY total_carreras DESC
        LIMIT 10
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

/* = CRUD ADMINISTRADORES == */
app.get("/api/administradores", verificarToken, (req, res) => {
    db.query(`
        SELECT a.id_administrador, a.nombre, a.correo, a.activo, r.nombre as rol_nombre
        FROM administrador a
        JOIN rol_administrador r ON a.id_rol = r.id_rol
        ORDER BY a.id_administrador
    `, (err, resu) => {
        if (err) return res.status(500).json({ error: err });
        res.json(resu);
    });
});

app.post("/api/admin/administradores", verificarToken, verificarSuperAdmin, async (req, res) => {
    const { nombre, correo, contrasena, id_rol, activo } = req.body;
    
    if (!nombre || !correo || !contrasena) {
        return res.status(400).json({ mensaje: "Faltan campos obligatorios" });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        db.query(
            "INSERT INTO administrador (nombre, correo, contrasena, id_rol, activo) VALUES (?,?,?,?,?)",
            [nombre, correo, hashedPassword, id_rol || 2, activo !== undefined ? activo : 1],
            (err, result) => {
                if (err) return res.status(500).json({ error: err });
                res.json({ mensaje: "Administrador creado exitosamente", id: result.insertId });
            }
        );
    } catch (error) {
        res.status(500).json({ mensaje: "Error al crear administrador", error });
    }
});

app.put("/api/admin/administradores/:id", verificarToken, verificarSuperAdmin, async (req, res) => {
    const { nombre, correo, contrasena, id_rol, activo } = req.body;
    let sql, params;
    
    if (contrasena) {
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        sql = "UPDATE administrador SET nombre=?, correo=?, contrasena=?, id_rol=?, activo=? WHERE id_administrador=?";
        params = [nombre, correo, hashedPassword, id_rol, activo, req.params.id];
    } else {
        sql = "UPDATE administrador SET nombre=?, correo=?, id_rol=?, activo=? WHERE id_administrador=?";
        params = [nombre, correo, id_rol, activo, req.params.id];
    }
    
    db.query(sql, params, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ mensaje: "Administrador actualizado exitosamente" });
    });
});

app.delete("/api/admin/administradores/:id", verificarToken, verificarSuperAdmin, (req, res) => {
    db.query("DELETE FROM administrador WHERE id_administrador=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ mensaje: "Administrador eliminado exitosamente" });
    });
});

/* ROLES*/
app.get("/api/roles", verificarToken, (req, res) => {
    db.query("SELECT * FROM rol_administrador", (err, resu) => {
        if (err) return res.status(500).json({ error: err });
        res.json(resu);
    });
});

/* ENCUESTA VOCACIONAL  */

// obtener todas las preguntas con sus opciones
app.get("/api/encuesta/preguntas", (req, res) => {
    const sql = `
        SELECT 
            p.id_pregunta, 
            p.enunciado as texto, 
            p.id_encuesta,
            COALESCE(
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id_opcion', o.id_opcion,
                        'texto', o.texto
                    )
                ),
                JSON_ARRAY()
            ) as opciones
        FROM pregunta p
        LEFT JOIN opcion o ON p.id_pregunta = o.id_pregunta
        GROUP BY p.id_pregunta, p.enunciado, p.id_encuesta
        ORDER BY p.id_pregunta
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error en /api/encuesta/preguntas:", err);
            return res.status(500).json({ error: err.message });
        }
        
        // parseo JSON de opciones
        const preguntas = results.map(p => {
            let opciones = [];
            try {
                opciones = p.opciones ? JSON.parse(p.opciones) : [];
                // Filtrar opciones nulas (cuando no hay opciones)
                if (opciones && opciones[0] && opciones[0].id_opcion === null) {
                    opciones = [];
                }
            } catch (e) {
                console.error("Error parsing JSON:", e);
                opciones = [];
            }
            return {
                ...p,
                opciones: opciones
            };
        });
        
        console.log(`Enviando ${preguntas.length} preguntas con opciones`);
        res.json(preguntas);
    });
});

// ruta para obtener puntajes de una opción (es para calcular resultados)
app.get("/api/opcion-puntajes/:id_opcion", (req, res) => {
    const sql = `
        SELECT oa.id_area, a.nombre as area_nombre, oa.puntaje
        FROM opcion_area oa
        JOIN area_vocacional a ON oa.id_area = a.id_area
        WHERE oa.id_opcion = ?
    `;
    
    db.query(sql, [req.params.id_opcion], (err, results) => {
        if (err) {
            console.error("Error en /api/opcion-puntajes:", err);
            return res.status(500).json({ error: err });
        }
        res.json(results);
    });
});

// guardar resultado de encuesta (para usuarios no logueados)
app.post("/api/encuesta/resultado", (req, res) => {
    const { respuestas, area_principal, puntajes_completos } = req.body;
    
    // validar los datos
    if (!respuestas || !area_principal || !puntajes_completos) {
        return res.status(400).json({ mensaje: "Faltan datos requeridos" });
    }
    
    // 1. guardar resultado principal
    const sqlResultado = `
        INSERT INTO resultado_encuesta 
        (fecha, id_area_resultado, id_universidad_recomendada) 
        VALUES (NOW(), ?, NULL)
    `;
    
    db.query(sqlResultado, [area_principal], (err, result) => {
        if (err) {
            console.error("Error guardando resultado:", err);
            return res.status(500).json({ error: err.message });
        }
        
        const id_resultado = result.insertId;
        
        // 2.recomendar universidades basadas en el area principal
        const sqlRecomendaciones = `
            SELECT DISTINCT u.id_universidad, u.nombre, u.ciudad, u.departamento, 
                   u.sitio_web, u.descripcion,
                   COUNT(c.id_carrera) as total_carreras
            FROM universidad u
            INNER JOIN carrera c ON u.id_universidad = c.id_universidad
            WHERE c.id_area = ?
            GROUP BY u.id_universidad, u.nombre, u.ciudad, u.departamento, u.sitio_web, u.descripcion
            ORDER BY total_carreras DESC
            LIMIT 5
        `;
        
        db.query(sqlRecomendaciones, [area_principal], (err, universidades) => {
            if (err) {
                console.error("Error obteniendo recomendaciones:", err);
                return res.status(500).json({ error: err.message });
            }
            
            // Actualizar con la universidad recomendada (la primera)
            if (universidades && universidades.length > 0) {
                const sqlUpdate = `
                    UPDATE resultado_encuesta 
                    SET id_universidad_recomendada = ? 
                    WHERE id_resultado = ?
                `;
                db.query(sqlUpdate, [universidades[0].id_universidad, id_resultado]);
            }
            
            res.json({
                mensaje: "Resultado guardado exitosamente",
                id_resultado,
                area_recomendada: area_principal,
                universidades_recomendadas: universidades || []
            });
        });
    });
});

//estadísticas de encuestas para el dashboard
app.get("/api/admin/encuesta/stats", verificarToken, (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total_encuestas,
            DATE(fecha) as fecha,
            COUNT(*) as cantidad
        FROM resultado_encuesta
        WHERE fecha IS NOT NULL
        GROUP BY DATE(fecha)
        ORDER BY fecha DESC
        LIMIT 30
    `;
    
    db.query(sql, (err, resultados) => {
        if (err) {
            console.error("Error en /api/admin/encuesta/stats:", err);
            return res.status(500).json({ error: err });
        }
        res.json(resultados || []);
    });
});

//distribucion de areas en los tests
app.get("/api/admin/encuesta/distribucion-areas", verificarToken, (req, res) => {
    const sql = `
        SELECT 
            a.nombre as area,
            a.id_area,
            COUNT(r.id_resultado) as total_tests,
            ROUND(IFNULL(COUNT(r.id_resultado) * 100.0 / NULLIF((SELECT COUNT(*) FROM resultado_encuesta), 0), 0), 2) as porcentaje
        FROM area_vocacional a
        LEFT JOIN resultado_encuesta r ON a.id_area = r.id_area_resultado
        GROUP BY a.id_area, a.nombre
        ORDER BY total_tests DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error en /api/admin/encuesta/distribucion-areas:", err);
            return res.status(500).json({ error: err });
        }
        res.json(results);
    });
});

// últimas encuestas realizadas
app.get("/api/admin/encuesta/ultimas", verificarToken, (req, res) => {
    const sql = `
        SELECT 
            r.id_resultado,
            r.fecha,
            a.nombre as area_resultado,
            u.nombre as universidad_recomendada
        FROM resultado_encuesta r
        LEFT JOIN area_vocacional a ON r.id_area_resultado = a.id_area
        LEFT JOIN universidad u ON r.id_universidad_recomendada = u.id_universidad
        ORDER BY r.fecha DESC
        LIMIT 20
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error en /api/admin/encuesta/ultimas:", err);
            return res.status(500).json({ error: err });
        }
        res.json(results || []);
    });
});

//  preguntas por ID de encuesta
app.get("/api/encuesta/:id_encuesta", (req, res) => {
    const idEncuesta = req.params.id_encuesta;
    
    // consultar para obtener preguntas con sus opciones
    const sql = `
        SELECT 
            p.id_pregunta,
            p.enunciado as texto,
            o.id_opcion,
            o.texto as opcion_texto
        FROM pregunta p
        LEFT JOIN opcion o ON p.id_pregunta = o.id_pregunta
        WHERE p.id_encuesta = ?
        ORDER BY p.id_pregunta, o.id_opcion
    `;
    
    db.query(sql, [idEncuesta], (err, rows) => {
        if (err) {
            console.error("Error en /api/encuesta/:id_encuesta:", err);
            return res.status(500).json({ error: err.message });
        }
        
        // para orgainizar los datos en el formato para el front
        const preguntasMap = new Map();
        
        rows.forEach(row => {
            if (!preguntasMap.has(row.id_pregunta)) {
                preguntasMap.set(row.id_pregunta, {
                    id_pregunta: row.id_pregunta,
                    texto: row.texto,
                    opciones: []
                });
            }
            
            // Si tiene opción (no es null)
            if (row.id_opcion) {
                const pregunta = preguntasMap.get(row.id_pregunta);
                pregunta.opciones.push({
                    id_opcion: row.id_opcion,
                    texto: row.opcion_texto
                });
            }
        });
        
        const resultado = Array.from(preguntasMap.values());
        
        console.log(`Enviando ${resultado.length} preguntas`);
        resultado.forEach(p => {
            console.log(`   - Pregunta ${p.id_pregunta}: ${p.opciones.length} opciones`);
        });
        
        res.json(resultado);
    });
});


/* BACKUP DE BASE DE DATOS */

// endpoint para generar backup (solo superadmin)
app.get("/api/admin/backup", verificarToken, verificarSuperAdmin, async (req, res) => {
    try {
        const tablas = [
            'administrador', 'area_vocacional', 'carrera', 'encuesta',
            'estado_universidad', 'opcion', 'opcion_area', 'pregunta',
            'resultado_encuesta', 'rol_administrador', 'universidad'
        ];
        
        let backupSQL = `-- =============================================\n`;
        backupSQL += `-- BACKUP BASE DE DATOS UNIMATCH\n`;
        backupSQL += `-- Fecha: ${new Date().toLocaleString('es-CO')}\n`;
        backupSQL += `-- Generado por: ${req.adminId}\n`;
        backupSQL += `-- =============================================\n\n`;
        
        backupSQL += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;
        
        for (const tabla of tablas) {
            // obtener estructura de la tabla
            const [estructura] = await db.promise().query(`SHOW CREATE TABLE ${tabla}`);
            if (estructura.length > 0) {
                backupSQL += `-- -----------------------------------------------------\n`;
                backupSQL += `-- Tabla: ${tabla}\n`;
                backupSQL += `-- -----------------------------------------------------\n`;
                backupSQL += `DROP TABLE IF EXISTS \`${tabla}\`;\n`;
                backupSQL += estructura[0]['Create Table'] + ';\n\n';
            }
            
            //recibir losdatos de la tabla
            const [datos] = await db.promise().query(`SELECT * FROM ${tabla}`);
            if (datos.length > 0) {
                backupSQL += `-- Insertando datos en ${tabla} (${datos.length} registros)\n`;
                
                for (const row of datos) {
                    const columns = Object.keys(row);
                    const values = columns.map(col => {
                        const val = row[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                        if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        return val;
                    });
                    backupSQL += `INSERT INTO \`${tabla}\` (\`${columns.join('`, `')}\`) VALUES (${values.join(', ')});\n`;
                }
                backupSQL += `\n`;
            }
        }
        
        backupSQL += `SET FOREIGN_KEY_CHECKS = 1;\n`;
        backupSQL += `-- =============================================\n`;
        backupSQL += `-- FIN DEL BACKUP\n`;
        backupSQL += `-- Total tablas: ${tablas.length}\n`;
        backupSQL += `-- =============================================\n`;
        
        // configuracionc para descargar archivo
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename=unimatch_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.sql`);
        res.send(backupSQL);
        
    } catch (error) {
        console.error('Error generando backup:', error);
        res.status(500).json({ mensaje: 'Error al generar el backup', error: error.message });
    }
});

// endpoint para obtener información del backup (estadis)
app.get("/api/admin/backup-info", verificarToken, verificarSuperAdmin, async (req, res) => {
    try {
        const tablas = [
            'administrador', 'area_vocacional', 'carrera', 'encuesta',
            'estado_universidad', 'opcion', 'opcion_area', 'pregunta',
            'resultado_encuesta', 'rol_administrador', 'universidad'
        ];
        
        const info = {};
        for (const tabla of tablas) {
            const [count] = await db.promise().query(`SELECT COUNT(*) as total FROM ${tabla}`);
            info[tabla] = count[0].total;
        }
        
        res.json({
            fecha: new Date(),
            tablas: info,
            total_registros: Object.values(info).reduce((a, b) => a + b, 0)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/*  RESTAURACIÓN BACKUP  */

// endpoint para restaurar backup (solo para superadmin)
app.post("/api/admin/restaurar-backup", verificarToken, verificarSuperAdmin, async (req, res) => {
    //verificar que se envió un archivo
    if (!req.files || !req.files.backupFile) {
        return res.status(400).json({ mensaje: "No se envió ningún archivo de backup" });
    }
    
    const backupFile = req.files.backupFile;
    
    //verificar extensión
    if (!backupFile.name.endsWith('.sql')) {
        return res.status(400).json({ mensaje: "El archivo debe tener extensión .sql" });
    }
    
    //que lea el contenido del archivo
    const sqlContent = backupFile.data.toString();
    
    // dividir las consultas SQL en este caso con ;)
    const queries = sqlContent.split(';').filter(q => q.trim().length > 0);
    
    let restoredTables = [];
    let errors = [];
    
    // quitar verificaciones de claves foráneas temporalmente
    await db.promise().query('SET FOREIGN_KEY_CHECKS = 0');
    
    for (const query of queries) {
        try {
            await db.promise().query(query);
            
            // ver  qué tabla se está restaurando (para mostrar progreso)
            const match = query.match(/INSERT INTO `?(\w+)`?/i);
            if (match && !restoredTables.includes(match[1])) {
                restoredTables.push(match[1]);
            }
        } catch (err) {
            // se ignoran errores como lo de drop table
            if (!err.message.includes('Unknown table') && !err.message.includes('already exists')) {
                errors.push({ query: query.substring(0, 100), error: err.message });
            }
        }
    }
    
    // tener en cuenta las verificaciones de claves foráneas
    await db.promise().query('SET FOREIGN_KEY_CHECKS = 1');
    
    if (errors.length > 0) {
        return res.status(500).json({
            mensaje: "Backup restaurado con advertencias",
            tablas_restauradas: restoredTables,
            errores: errors.slice(0, 5) // Solo mostrar primeros 5 errores
        });
    }
    
    res.json({
        mensaje: "✅ Backup restaurado exitosamente",
        tablas_restauradas: restoredTables,
        total_consultas: queries.length
    });
});

// iniciar el servidor en el powershell de windows
app.listen(3000, () => {
    console.log("Servidor corriendo en puerto 3000");
    console.log("API endpoints disponibles:");
    console.log("   - POST   /api/login-admin");
    console.log("   - GET    /api/encuesta/preguntas");
    console.log("   - POST   /api/encuesta/resultado");
    console.log("   - GET    /api/opcion-puntajes/:id");
    console.log("   - GET    /api/admin/encuesta/* (requiere token)");
});
