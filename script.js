const SUPABASE_URL = 'https://dvsoyesscauzsirtjthh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2c295ZXNzY2F1enNpcnRqdGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQzNTU4NDQsImV4cCI6MjAyOTkzMTg0NH0.3HoGdobfXm7-SJtRSVF7R9kraDNHBFsiEaJunMjwpHk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
document.addEventListener('DOMContentLoaded', async () => {
    const checkinList = document.getElementById('checkin-list');
    const voteContainer = document.getElementById('vote-container');
    const movieList = document.getElementById('movie-list');
    const signatureContainer = document.getElementById('signature-container');
    const signaturePadElement = document.querySelector('#signature-pad canvas');
    const clearSignatureButton = document.getElementById('clear-signature');
    const submitSignatureButton = document.getElementById('submit-signature');
    const submitVoteButton = document.getElementById('submit-vote');
    const addPersonForm = document.getElementById('add-person-form');
    const nameInput = document.getElementById('name');
    const signaturePad = new SignaturePad(signaturePadElement);
    let currentCheckinId = null;
    let selectedMovieId = null;

    // Ensure the canvas size is correct
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        signaturePadElement.width = signaturePadElement.offsetWidth * ratio;
        signaturePadElement.height = signaturePadElement.offsetHeight * ratio;
        signaturePadElement.getContext('2d').scale(ratio, ratio);
        signaturePad.clear(); // Otherwise isEmpty() might return incorrect value
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // First call to set the canvas size

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

    loadCheckins();
    loadMovies();

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
        voteContainer.style.display = 'block';
        signatureContainer.style.display = 'none';
    };

    async function submitVote() {
        if (!selectedMovieId) {
            alert("Please select a movie.");
            return;
        }

        const { error } = await supabaseClient
            .from('movies')
            .update({ votes: supabaseClient.rpc('increment', { x: 1 }) })
            .eq('id', selectedMovieId);

        if (error) {
            console.error('Error voting for movie:', error);
            return;
        }

        voteContainer.style.display = 'none';
        signatureContainer.style.display = 'block';
        resizeCanvas(); // Ensure canvas is correctly sized when displayed
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
        signatureContainer.style.display = 'none';
        signaturePad.clear();
        loadCheckins();
        loadMovies();
    }
});
