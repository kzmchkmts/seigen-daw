const bones = document.querySelectorAll(".bone");

bones.forEach(bone => {
  bone.addEventListener("click", () => {
    if (bone.classList.contains("head")) return;
    bone.classList.toggle("active");
  });
});