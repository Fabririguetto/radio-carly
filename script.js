const express = require('express'); // Asegúrate de instalar express con `npm install express`
const app = express();
const mysql = require('mysql2');

// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
  host: 'localhost', // Cambia esto por la dirección de tu servidor de base de datos
  user: 'root', // Cambia esto por tu usuario de la base de datos
  password: 'root', // Cambia esto por tu contraseña de la base de datos
  database: 'radio', // Cambia esto por el nombre de tu base de datos
  port: 3306 // Cambia esto si tu base de datos usa un puerto diferente
});

// Verificar conexión
connection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa a la base de datos');
});

// Endpoint para validar un cliente específico por DNI
app.get('/clientes', (req, res) => {
  const dni = req.query.dni; // Obtener el DNI de los parámetros de la solicitud

  if (dni === '44') {
       // Si no se proporciona un DNI, devolver todos los clientes
    const query = 'SELECT * FROM clientes';
    connection.query(query, (err, rows) => {
      if (err) {
        console.error('Error en la consulta:', err);
        res.status(500).send('Error al consultar la base de datos.');
        return;
      }
      res.json(rows); // Enviar todos los clientes como JSON
    });
  } else if (dni) {
     // Si se proporciona un DNI, buscar solo ese cliente
    const query = 'SELECT * FROM clientes WHERE dni = ?';
    connection.query(query, [dni], (err, rows) => {
      if (err) {
        console.error('Error en la consulta:', err);
        res.status(500).send('Error al consultar la base de datos.');
        return;
      }
      res.json(rows); // Enviar los datos del cliente como JSON
    });
  } else {
    // Si no se proporciona un DNI y no es '44810049', devolver un mensaje de error
    res.status(400).send('DNI no proporcionado o inválido.');
  }
});

// Servir archivos estáticos (como el HTML)
app.use(express.static('public'));

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor iniciado en http://localhost:3000');
});

