const jwt = require("jsonwebtoken");
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

/* =========================
CONEXION MYSQL (POOL)
========================= */

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "Unimatch"
});
const SECRET_KEY = "unimatch_key";

console.log("Pool de MySQL listo");


app.post("/api/login-admin", (req, res) => {

const { correo, contrasena } = req.body;

const sql = "SELECT * FROM administrador WHERE correo = ? AND activo = 1";

db.query(sql, [correo], async (err, result) => {

if (err) return res.status(500).json({ mensaje: "Error del servidor" });

if (result.length === 0)
return res.status(401).json({ mensaje: "Administrador no encontrado" });

const admin = result[0];

const valido = await bcrypt.compare(contrasena, admin.contrasena);

if (!valido)
return res.status(401).json({ mensaje: "Contraseña incorrecta" });

const token = jwt.sign(
{
id: admin.id_administrador,
rol: admin.id_rol
},
SECRET_KEY,
{ expiresIn: "2h" }
);

res.json({
mensaje: "Login exitoso",
token: token,
rol: admin.id_rol
});

});

});


/* =========================
AREAS VOCACIONALES
========================= */

app.get("/api/areas", (req, res) => {

    db.query("SELECT * FROM area_vocacional", (err, result) => {

        if (err) return res.status(500).json({ mensaje: "Error del servidor" });

        res.json(result);

    });

});


/* =========================
ROLES ADMIN
========================= */

app.get("/api/roles", (req, res) => {

    db.query("SELECT * FROM rol_administrador", (err, result) => {

        if (err) return res.status(500).json({ mensaje: "Error del servidor" });

        res.json(result);

    });

});
/* =========================
ADMINISTRADORES
========================= */

app.get("/api/administradores", (req, res) => {

    db.query(
        "SELECT id_administrador, nombre, correo, id_rol, activo FROM administrador",
        (err, result) => {

            if (err) return res.status(500).json({ mensaje: "Error obteniendo administradores" });

            res.json(result);
        }
    );
});


app.post("/api/administradores", async (req, res) => {

    const { nombre, correo, contrasena, id_rol, activo } = req.body;

    if (!contrasena) {
        return res.status(400).json({ mensaje: "La contraseña es obligatoria" });
    }

    try {

        const hash = await bcrypt.hash(contrasena, 10);

        const sql = `
        INSERT INTO administrador
        (nombre, correo, contrasena, id_rol, activo)
        VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [nombre, correo, hash, id_rol, activo],
            (err, result) => {

                if (err) return res.status(500).json({ mensaje: "Error creando administrador" });

                res.json({
                    mensaje: "Administrador creado",
                    id: result.insertId
                });

            }
        );

    } catch (error) {

        res.status(500).json({ mensaje: "Error en el servidor" });

    }

});


app.put("/api/administradores/:id", async (req, res) => {

    const id = req.params.id;

    const { nombre, correo, contrasena, id_rol, activo } = req.body;

    try {

        if (contrasena) {

            const hash = await bcrypt.hash(contrasena, 10);

            const sql = `
            UPDATE administrador
            SET nombre=?, correo=?, contrasena=?, id_rol=?, activo=?
            WHERE id_administrador=?
            `;

            db.query(
                sql,
                [nombre, correo, hash, id_rol, activo, id],
                (err) => {

                    if (err) return res.status(500).json({ mensaje: "Error actualizando administrador" });

                    res.json({ mensaje: "Administrador actualizado" });

                }
            );

        } else {

            const sql = `
            UPDATE administrador
            SET nombre=?, correo=?, id_rol=?, activo=?
            WHERE id_administrador=?
            `;

            db.query(
                sql,
                [nombre, correo, id_rol, activo, id],
                (err) => {

                    if (err) return res.status(500).json({ mensaje: "Error actualizando administrador" });

                    res.json({ mensaje: "Administrador actualizado" });

                }
            );

        }

    } catch (error) {

        res.status(500).json({ mensaje: "Error del servidor" });

    }

});


app.delete("/api/administradores/:id", (req, res) => {

    const id = req.params.id;

    db.query(
        "DELETE FROM administrador WHERE id_administrador=?",
        [id],
        (err) => {

            if (err) return res.status(500).json({ mensaje: "Error eliminando administrador" });

            res.json({ mensaje: "Administrador eliminado" });

        }
    );

});


/* =========================
UNIVERSIDADES
========================= */

app.get("/api/universidades", (req, res) => {

    db.query("SELECT * FROM universidad", (err, result) => {

        if (err) return res.status(500).json({ mensaje: "Error del servidor" });

        res.json(result);

    });

});


app.post("/api/universidades", (req, res) => {

    const { nombre, ciudad, departamento, descripcion, sitio_web, id_estado } = req.body;

    const sql = `
    INSERT INTO universidad
    (nombre, ciudad, departamento, descripcion, sitio_web, id_estado)
    VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql,
        [nombre, ciudad, departamento, descripcion, sitio_web, id_estado],
        (err, result) => {

            if (err) return res.status(500).json({ mensaje: "Error al crear universidad" });

            res.json({
                mensaje: "Universidad creada",
                id: result.insertId
            });

        });

});


app.put("/api/universidades/:id", (req, res) => {

    const id = req.params.id;

    const { nombre, ciudad, departamento, descripcion, sitio_web, id_estado } = req.body;

    const sql = `
    UPDATE universidad
    SET nombre=?, ciudad=?, departamento=?, descripcion=?, sitio_web=?, id_estado=?
    WHERE id_universidad=?
    `;

    db.query(sql,
        [nombre, ciudad, departamento, descripcion, sitio_web, id_estado, id],
        (err) => {

            if (err) return res.status(500).json({ mensaje: "Error actualizando universidad" });

            res.json({ mensaje: "Universidad actualizada" });

        });

});


app.delete("/api/universidades/:id", (req, res) => {

    const id = req.params.id;

    db.query("DELETE FROM universidad WHERE id_universidad=?",
        [id],
        (err) => {

            if (err) return res.status(500).json({ mensaje: "Error eliminando universidad" });

            res.json({ mensaje: "Universidad eliminada" });

        });

});


/* =========================
CARRERAS
========================= */

app.get("/api/carreras", (req, res) => {

    db.query("SELECT * FROM carrera", (err, result) => {

        if (err) return res.status(500).json({ mensaje: "Error del servidor" });

        res.json(result);

    });

});


app.post("/api/carreras", (req, res) => {

    const { nombre, descripcion, id_area, id_universidad } = req.body;

    const sql = `
    INSERT INTO carrera
    (nombre, descripcion, id_area, id_universidad)
    VALUES (?, ?, ?, ?)
    `;

    db.query(sql,
        [nombre, descripcion, id_area, id_universidad],
        (err, result) => {

            if (err) return res.status(500).json({ mensaje: "Error creando carrera" });

            res.json({ id: result.insertId });

        });

});


app.put("/api/carreras/:id", (req, res) => {

    const id = req.params.id;

    const { nombre, descripcion, id_area, id_universidad } = req.body;

    const sql = `
    UPDATE carrera
    SET nombre=?, descripcion=?, id_area=?, id_universidad=?
    WHERE id_carrera=?
    `;

    db.query(sql,
        [nombre, descripcion, id_area, id_universidad, id],
        (err) => {

            if (err) return res.status(500).json({ mensaje: "Error actualizando carrera" });

            res.json({ mensaje: "Carrera actualizada" });

        });

});


app.delete("/api/carreras/:id", (req, res) => {

    db.query("DELETE FROM carrera WHERE id_carrera=?",
        [req.params.id],
        (err) => {

            if (err) return res.status(500).json({ mensaje: "Error eliminando carrera" });

            res.json({ mensaje: "Carrera eliminada" });

        });

});


/* =========================
ENCUESTAS
========================= */

app.get("/api/encuestas", (req, res) => {

    db.query("SELECT * FROM encuesta", (err, result) => {

        if (err) return res.status(500).json({ mensaje: "Error del servidor" });

        res.json(result);

    });

});


app.post("/api/encuestas", (req, res) => {

    const { nombre, descripcion, activa } = req.body;

    db.query(
        "INSERT INTO encuesta (nombre, descripcion, activa) VALUES (?, ?, ?)",
        [nombre, descripcion, activa],
        (err, result) => {

            if (err) return res.status(500).json({ mensaje: "Error creando encuesta" });

            res.json({ id: result.insertId });

        });

});


app.put("/api/encuestas/:id", (req, res) => {

    const { nombre, descripcion, activa } = req.body;

    db.query(
        "UPDATE encuesta SET nombre=?, descripcion=?, activa=? WHERE id_encuesta=?",
        [nombre, descripcion, activa, req.params.id],
        (err) => {

            if (err) return res.status(500).json({ mensaje: "Error actualizando encuesta" });

            res.json({ mensaje: "Encuesta actualizada" });

        });

});


/* =========================
PREGUNTAS
========================= */

app.get("/api/preguntas", (req, res) => {

    db.query("SELECT * FROM pregunta", (err, result) => {

        if (err) return res.status(500).json({ mensaje: "Error del servidor" });

        res.json(result);

    });

});


app.post("/api/preguntas", (req, res) => {

    const { id_encuesta, enunciado } = req.body;

    db.query(
        "INSERT INTO pregunta (id_encuesta, enunciado) VALUES (?, ?)",
        [id_encuesta, enunciado],
        (err, result) => {

            if (err) return res.status(500).json({ mensaje: "Error creando pregunta" });

            res.json({ id: result.insertId });

        });

});


app.delete("/api/preguntas/:id", (req, res) => {

    db.query("DELETE FROM pregunta WHERE id_pregunta=?",
        [req.params.id],
        (err) => {

            if (err) return res.status(500).json({ mensaje: "Error eliminando pregunta" });

            res.json({ mensaje: "Pregunta eliminada" });

        });

});


/* =========================
KPIs
========================= */

app.get("/api/counts", (req, res) => {

    const sql = `
    SELECT
    (SELECT COUNT(*) FROM universidad) AS universidades,
    (SELECT COUNT(*) FROM carrera) AS carreras,
    (SELECT COUNT(*) FROM pregunta) AS preguntas
    `;

    db.query(sql, (err, result) => {

        if (err) return res.status(500).json({ mensaje: "Error obteniendo conteos" });

        res.json(result[0]);

    });

});


/* =========================
SERVIDOR
========================= */

app.listen(3000, () => {

    console.log("Servidor corriendo en puerto 3000");

});
