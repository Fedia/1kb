// State management using signals
const currentSurvey = signal(null);
const userResponses = signal({});
const loading = signal(false);
const error = signal('');
const success = signal('');

// Generate survey using AI
async function generateSurvey() {
    loading(true);
    error('');
    try {
        // Replace with your actual AI API endpoint
        const response = await fetch('/api/generate-survey');
        const survey = await response.json();
        currentSurvey(survey);
    } catch (err) {
        error('Failed to generate survey: ' + err.message);
    } finally {
        loading(false);
    }
}

// Save survey response
async function saveSurveyResponse(responses) {
    loading(true);
    error('');
    try {
        // Replace with your actual API endpoint
        const response = await fetch('/api/save-response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(responses)
        });
        
        if (!response.ok) throw new Error('Failed to save response');
        
        success('Thank you for completing the survey!');
        userResponses({});
    } catch (err) {
        error('Failed to save response: ' + err.message);
    } finally {
        loading(false);
    }
}

// Handle response updates
function updateResponse(questionId, value) {
    userResponses(prev => ({
        ...prev,
        [questionId]: value
    }));
}

// Render survey
function renderSurvey() {
    const survey = currentSurvey();
    if (!survey) return html`<p>Loading survey...</p>`;

    return html`
        <div class="survey-form">
            ${survey.questions.map(question => html`
                <div class="question">
                    <h3>${question.text}</h3>
                    <div class="options">
                        ${renderQuestionType(question)}
                    </div>
                </div>
            `)}
            <button onclick=${submitSurvey} disabled=${loading()}>
                ${loading() ? 'Submitting...' : 'Submit Survey'}
            </button>
            ${error() && html`<div class="error">${error()}</div>`}
            ${success() && html`<div class="success">${success()}</div>`}
        </div>
    `;
}

// Render different question types
function renderQuestionType(question) {
    switch (question.type) {
        case 'multiple_choice':
            return question.options.map(option => html`
                <label>
                    <input 
                        type="radio" 
                        name=${question.id}
                        value=${option}
                        onchange=${e => updateResponse(question.id, e.target.value)}
                    />
                    ${option}
                </label>
            `);
        
        case 'text':
            return html`
                <textarea 
                    rows="3"
                    onchange=${e => updateResponse(question.id, e.target.value)}
                ></textarea>
            `;
        
        case 'rating':
            return html`
                <select onchange=${e => updateResponse(question.id, e.target.value)}>
                    <option value="">Select rating</option>
                    ${Array.from({length: 5}, (_, i) => i + 1).map(num => html`
                        <option value=${num}>${num}</option>
                    `)}
                </select>
            `;
            
        default:
            return html`<p>Unsupported question type</p>`;
    }
}

// Submit survey
function submitSurvey() {
    const responses = userResponses();
    const survey = currentSurvey();
    
    // Validate responses
    const unanswered = survey.questions.filter(q => !responses[q.id]);
    if (unanswered.length > 0) {
        error('Please answer all questions before submitting');
        return;
    }
    
    saveSurveyResponse(responses);
}

// Initialize survey
effect(() => {
    const surveyEl = document.getElementById('survey');
    if (surveyEl) {
        surveyEl.replaceChildren(...renderSurvey());
    }
});

// Generate initial survey
generateSurvey();