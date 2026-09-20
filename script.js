const pageFrame = document.getElementById("pageFrame");
const pageContainer = document.getElementById("pageContainer");

const navigationLinks = document.querySelectorAll(
    ".main-nav a[data-page]"
);


navigationLinks.forEach(link => {

    link.addEventListener("click", function(event) {

        event.preventDefault();

        const newPage = this.dataset.page;

        // Don't reload the same page
        if (pageFrame.getAttribute("src") === newPage) {
            return;
        }

        // Fade out
        pageContainer.classList.add("fade-out");


        // Wait for fade-out
        setTimeout(() => {

            // Change iframe page
            pageFrame.src = newPage;


            // Wait until new page loads
            pageFrame.onload = () => {

                // Fade back in
                requestAnimationFrame(() => {
                    pageContainer.classList.remove("fade-out");
                });

            };

        }, 350);

    });

});