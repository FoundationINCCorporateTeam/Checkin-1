const SUPABASE_URL = 'https://dvsoyesscauzsirtjthh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2c295ZXNzY2F1enNpcnRqdGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQzNTU4NDQsImV4cCI6MjAyOTkzMTg0NH0.3HoGdobfXm7-SJtRSVF7R9kraDNHBFsiEaJunMjwpHk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
document.addEventListener('DOMContentLoaded', async () => {
    const checkinList = document.getElementById('checkin-list');
    const signatureContainer = document.getElementById('signature-container');
    const signaturePad = document.getElementById('signature-pad');
    const clearSignatureButton = document.getElementById('clear-signature');
    const submitSignatureButton = document.getElementById('submit-signature');
    const addPersonForm = document.getElementById('add-person-form');
    const nameInput = document.getElementById('name');
    const ctx = signaturePad.getContext('2d');
    let drawing = false;
    let currentCheckinId = null;

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

    loadCheckins();

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
    signaturePad.addEventListener('mousedown', startDrawing);
    signaturePad.addEventListener('mouseup', stopDrawing);
    signaturePad.addEventListener('mousemove', drawSignature);
    signaturePad.addEventListener('touchstart', startDrawing);
    signaturePad.addEventListener('touchend', stopDrawing);
    signaturePad.addEventListener('touchmove', drawSignature);
    clearSignatureButton.addEventListener('click', clearSignature);
    submitSignatureButton.addEventListener('click', submitSignature);

    window.checkIn = function(id) {
        currentCheckinId = id;
        signatureContainer.style.display = 'block';
    };

    async function submitSignature() {
        if (!currentCheckinId) return;

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
        clearSignature();
        loadCheckins();
    }

    function startDrawing(event) {
        drawing = true;
        ctx.beginPath();
        ctx.moveTo(getX(event), getY(event));
        event.preventDefault();
    }

    function stopDrawing() {
        drawing = false;
        ctx.beginPath();  // Reset the path to avoid connecting lines
    }

    function drawSignature(event) {
        if (!drawing) return;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.lineTo(getX(event), getY(event));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(getX(event), getY(event));
        event.preventDefault();
    }

    function getX(event) {
        const rect = signaturePad.getBoundingClientRect();
        if (event.touches && event.touches.length) {
            return event.touches[0].clientX - rect.left;
        }
        return event.clientX - rect.left;
    }

    function getY(event) {
        const rect = signaturePad.getBoundingClientRect();
        if (event.touches && event.touches.length) {
            return event.touches[0].clientY - rect.top;
        }
        return event.clientY - rect.top;
    }

    function clearSignature() {
        ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);
    }
});
