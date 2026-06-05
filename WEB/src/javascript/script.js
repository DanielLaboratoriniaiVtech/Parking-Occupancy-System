function atnaujintiLaika() {
    const dabar = new Date();

    const diena = dabar.getDate().toString().padStart(2, '0');
    const menuo = (dabar.getMonth() + 1).toString().padStart(2, '0');
    const metai = dabar.getFullYear();

    const valandos = dabar.getHours().toString().padStart(2, '0');
    const minutes = dabar.getMinutes().toString().padStart(2, '0');
    const sekundes = dabar.getSeconds().toString().padStart(2, '0');

    const formatas = `${metai}-${menuo}-${diena} ${valandos}:${minutes}:${sekundes}`;

    document.getElementById("laikas").textContent = formatas;
}

setInterval(atnaujintiLaika, 1000);

atnaujintiLaika();