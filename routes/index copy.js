const params = new URLSearchParams(window.location.search);
const user = params.get("user");
const welcome = document.querySelector("#welcome");

welcome.innerHTML = `Welcome back, ${user}!`;

/* The following code is for the second search page. */
const searchForm = document.querySelector("#searchForm");   
searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const searchTerm = document.querySelector("#searchTerm").value;
    const response = await fetch(`/api/search?term=${encodeURIComponent(searchTerm)}`);
    const data = await response.json();
    
    const resultsContainer = document.querySelector("#results");
    resultsContainer.innerHTML = ""; // Clear previous results

    if (data.length === 0) {
        resultsContainer.innerHTML = "<p>No results found.</p>";
        return;
    }

    data.forEach(item => {
        const resultItem = document.createElement("div");
        resultItem.classList.add("result-item");
        resultItem.innerHTML = `<h3>${item.title}</h3><p>${item.description}</p>`;
        resultsContainer.appendChild(resultItem);
    });
});
