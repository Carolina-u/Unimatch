document.getElementById("loginForm").addEventListener("submit", async function(e){

e.preventDefault();

const correo = document.getElementById("correo").value;
const contrasena = document.getElementById("contrasena").value;

try{

const res = await fetch("http://localhost:3000/api/login-admin",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body: JSON.stringify({
correo: correo,
contrasena: contrasena
})

});

const data = await res.json();

alert(data.mensaje);

if(data.mensaje === "Login exitoso"){

localStorage.setItem("token", data.token);
localStorage.setItem("adminRol", data.rol);

window.location.href = "PaneldeControl.html";

}

}catch(error){

console.error(error);
alert("Error conectando con el servidor");

}

});