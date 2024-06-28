const SUPABASE_URL = 'https://dvsoyesscauzsirtjthh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2c295ZXNzY2F1enNpcnRqdGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQzNTU4NDQsImV4cCI6MjAyOTkzMTg0NH0.3HoGdobfXm7-SJtRSVF7R9kraDNHBFsiEaJunMjwpHk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
$(document).ready(async function() {
    const checkinList = $('#checkin-list');
    const signatureContainer = $('#signature-container');
    const signaturePad = $('#signature-pad')[0];
    const clearSignatureButton = $('#clear-signature');
    const submitSignatureButton = $('#submit-signature');
    const addPersonForm = $('#add-person-form');
    const nameInput = $('#name')[0];
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

        checkinList.empty(); // Clear existing list
        // Display the list
        people.forEach(person => {
            const item = $(`
                <div class="checkin-item">
                    <span>${person.name}</span>
                    ${person.checked_in ? '<span class="checked">&#x2714;</span>' : `<button onclick="checkIn('${person.id}')">Check-in</button>`}
                </div>
            `);
            checkinList.append(item);
        });
    }

    loadCheckins();

    // Handle adding a new person
    addPersonForm.on('submit', async function(event) {
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
    $(signaturePad).on('mousedown', startDrawing);
    $(signaturePad).on('mouseup', stopDrawing);
    $(signaturePad).on('mousemove', drawSignature);
    $(signaturePad).on('touchstart', startDrawing);
    $(signaturePad).on('touchend', stopDrawing);
    $(signaturePad).on('touchmove', drawSignature);
    clearSignatureButton.on('click', clearSignature);
    submitSignatureButton.on('click', submitSignature);

    window.checkIn = function(id) {
        currentCheckinId = id;
        signatureContainer.css('display', 'block');
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
        signatureContainer.css('display', 'none');
        clearSignature();
        loadCheckins();
    }

    function startDrawing(event) {
        drawing = true;
        const rect = signaturePad.getBoundingClientRect();
        const x = event.type === 'touchstart' ? event.originalEvent.touches[0].clientX - rect.left : event.clientX - rect.left;
        const y = event.type === 'touchstart' ? event.originalEvent.touches[0].clientY - rect.top : event.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
        event.preventDefault();
    }

    function stopDrawing() {
        drawing = false;
        ctx.beginPath(); // Reset the path to avoid connecting lines
    }

    function drawSignature(event) {
        if (!drawing) return;
        const rect = signaturePad.getBoundingClientRect();
        const x = event.type === 'touchmove' ? event.originalEvent.touches[0].clientX - rect.left : event.clientX - rect.left;
        const y = event.type === 'touchmove' ? event.originalEvent.touches[0].clientY - rect.top : event.clientY - rect.top;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        event.preventDefault();
    }

    function clearSignature() {
        ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);
    }
});
