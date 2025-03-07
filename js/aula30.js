const toastElList = document.querySelectorAll(".toast");
const toastList = [...toastElList].map((toastEl) => {
    const toast = new bootstrap.Toast(toastEl, {});
    //toast.show();
});


//Código para a automação do empilhamento de toasts
const btnToast = document.getElementById("btnToast");
btnToast.addEventListener("click", () => {
    const toast = document.getElementById("toast");
    const container = document.getElementById("toastContainer");
    const novoToast = toast.cloneNode(true);
    novoToast.lastElementChild.innerHTML = "Mensagem em " + Date();
    container.appendChild(novoToast);
    const bsToast = new bootstrap.Toast(novoToast, {});
    bsToast.show();
});

//Cria os tolltips configurados com o atributo data-bs-toggle="tooltip"
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));

const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
const popoverList = [...popoverTriggerList].map((popoverTriggerEl) => new bootstrap.Popover(popoverTriggerEl));

//---------------------------------------------------------------------------------------------------------------

//Abrindo o toast por meio de um botão
let toastTrigger = document.getElementById('liveToastBtn')
let toastLiveExample = document.getElementById('liveToast')

if (toastTrigger) {
    toastTrigger.addEventListener('click', function () {
        let toast = new bootstrap.Toast(toastLiveExample)
        toast.show()
    })
}