auth.onAuthStateChanged(user => {
  if (!user && window.location.pathname.includes("lesson"))
    window.location.href = "../login.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  auth.signOut().then(() => window.location.href = "../login.html");
});
