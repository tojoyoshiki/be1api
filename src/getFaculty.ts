async function getFaculty() {
    const response = await fetch("http://localhost:3000/faculties/2");

    const data = await response.json();

    console.log(data);
}

getFaculty();
