const SUPABASE_URL = 'https://dvsoyesscauzsirtjthh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2c295ZXNzY2F1enNpcnRqdGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQzNTU4NDQsImV4cCI6MjAyOTkzMTg0NH0.3HoGdobfXm7-SJtRSVF7R9kraDNHBFsiEaJunMjwpHk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
document.addEventListener('DOMContentLoaded', async () => {
    const checkinList = document.getElementById('checkin-list');
    const addPersonForm = document.getElementById('add-person-form');
    const nameInput = document.getElementById('name');
    const selectMovieContainer = document.getElementById('select-movie-container');
    const signHereContainer = document.getElementById('sign-here-container');
    const movieList = document.getElementById('movie-list');
    const signaturePadElement = document.querySelector('#signature-pad canvas');
    const clearSignatureButton = document.getElementById('clear-signature');
    const submitSignatureButton = document.getElementById('submit-signature');
    const submitVoteButton = document.getElementById('submit-vote');
    const movieVotesList = document.getElementById('movie-votes-list');

    let currentCheckinId = null;
    let selectedMovieId = null;
    let signaturePad = null;

    // Ensure the canvas size is correct
    function resizeCanvas() {
        if (signaturePad) {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            signaturePad.canvas.width = signaturePadElement.offsetWidth * ratio;
            signaturePad.canvas.height = signaturePadElement.offsetHeight * ratio;
            signaturePad.clear(); // Ensure canvas is correctly sized after each resize
        }
    }

    window.addEventListener('resize', resizeCanvas);

    // Load check-in list from Supabase
    async function loadCheckins() {
        const { data: people, error } = await supabaseClient
            .from('checkins')
            .select('*');

        if (error) {
            console.error('Error fetching check-ins:', error);
            return;
        }

        checkinList.innerHTML = ''; // Clear existing list
        // Display the list
        people.forEach(person => {
            const item = document.createElement('div');
            item.className = 'checkin-item';
            item.innerHTML = `
                <span>${person.name}</span>
                ${person.checked_in ? '<span class="checked">&#x2714;</span>' : `<button onclick="checkIn('${person.id}')">Check-in</button>`}
            `;
            checkinList.appendChild(item);
        });
    }

    // Load movie list from Supabase
    async function loadMovies() {
        const { data: movies, error } = await supabaseClient
            .from('movies')
            .select('*');

        if (error) {
            console.error('Error fetching movies:', error);
            return;
        }

        movieList.innerHTML = ''; // Clear existing list
        // Display the list
        movies.forEach(movie => {
            const item = document.createElement('div');
            item.className = 'movie-item';
            item.innerHTML = `
                <input type="radio" name="movie" value="${movie.id}"> ${movie.title} (${movie.votes} votes)
            `;
            item.querySelector('input').addEventListener('change', () => {
                selectedMovieId = movie.id;
            });
            movieList.appendChild(item);
        });
    }

    // Load movie votes
    async function loadMovieVotes() {
        const { data: movies, error } = await supabaseClient
            .from('movies')
            .select('title, votes');

        if (error) {
            console.error('Error fetching movie votes:', error);
            return;
        }

        movieVotesList.innerHTML = ''; // Clear existing list
        // Display the list
        movies.forEach(movie => {
            const item = document.createElement('div');
            item.className = 'movie-vote-item';
            item.textContent = `${movie.title}: ${movie.votes} votes`;
            movieVotesList.appendChild(item);
        });
    }

    loadCheckins();
    loadMovies();
    loadMovieVotes();

    // Handle adding a new person
    addPersonForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = nameInput.value.trim();

        if (name === '') {
            alert('Please enter a name');
            return;
        }

        const { error } = await supabaseClient
            .from('checkins')
            .insert([{ name }]);

        if (error) {
            console.error('Error adding person:', error);
            return;
        }

        nameInput.value = '';
        loadCheckins();
    });

    // Signature pad event listeners
    clearSignatureButton.addEventListener('click', () => signaturePad.clear());
    submitSignatureButton.addEventListener('click', submitSignature);
    submitVoteButton.addEventListener('click', submitVote);

    window.checkIn = function(id) {
        currentCheckinId = id;
        selectMovieContainer.classList.remove('hidden');
        signHereContainer.classList.add('hidden');

        // Initialize SignaturePad when check-in button is clicked
        if (!signaturePad) {
            signaturePad = new SignaturePad(signaturePadElement, {
                backgroundColor: 'rgb(255, 255, 255)',
                penColor: 'black',
                onEnd: resizeCanvas // Ensure canvas is correctly sized after each signature
            });
            resizeCanvas(); // Call resizeCanvas once to set initial size
        }
    };

    async function submitVote() {
        if (!selectedMovieId) {
            alert("Please select a movie.");
            return;
        }

        const { error } = await supabaseClient
            .rpc('increment_votes', { movie_id: selectedMovieId });

        if (error) {
            console.error('Error voting for movie:', error);
            return;
        }

        selectMovieContainer.classList.add('hidden');
        signHereContainer.classList.remove('hidden');
        resizeCanvas(); // Ensure canvas is correctly sized when displayed
        loadMovies(); // Reload the movie list to reflect the updated vote count
        loadMovieVotes(); // Reload movie votes display
    }

    async function submitSignature() {
        if (!currentCheckinId) return;

        if (signaturePad.isEmpty()) {
            alert("Please provide a signature first.");
            return;
        }

        const signature = signaturePad.toDataURL();
        const { error } = await supabaseClient
            .from('checkins')
            .update({ checked_in: true, signature })
            .eq('id', currentCheckinId);

        if (error) {
            console.error('Error checking in:', error);
            return;
        }

        alert('Checked in successfully!');
        currentCheckinId = null;
        signHereContainer.classList.add('hidden');
        signaturePad.clear();
        loadCheckins();
    }
});
