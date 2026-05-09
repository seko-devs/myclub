class NavBar extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div class="container-fluid">
            <a class="navbar-brand" href="#">Navbar</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarsExampleDefault" aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarsExampleDefault">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                <li class="nav-item">
                <a class="nav-link active" aria-current="page" href="home.html">Home</a>
                </li>
                <li class="nav-item">
                <a class="nav-link active" aria-current="page" href="teams.html">Teams</a>
                </li>
                <li class="nav-item">
                <a class="nav-link" href="#">Link</a>
                </li>
                <li class="nav-item">
                <a class="nav-link disabled" href="#" tabindex="-1" aria-disabled="true">Disabled</a>
                </li>
                <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="dropdown01" data-bs-toggle="dropdown" aria-expanded="false">Dropdown</a>
                <ul class="dropdown-menu" aria-labelledby="dropdown01">
                    <li><a class="dropdown-item" href="#">Action</a></li>
                    <li><a class="dropdown-item" href="#">Another action</a></li>
                    <li><a class="dropdown-item" href="#">Something else here</a></li>
                </ul>
                </li>
            </ul>
            <!--zet hier the user component-->           
            </div>
        </div>
        </nav>
      `;
  
      this.querySelectorAll('.nav-link').forEach(link => {
        if (link.href === window.location.href) {
          link.classList.add('active');
        }
      });
    }
  }
  
  customElements.define('nav-bar', NavBar);

  console.log('navbar.js loaded!'); // add this line