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
        const response = await fetch('/api/generate-survey');
        if (!response.ok) throw new Error('Failed to generate survey');
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
        const response = await fetch('/api/save-response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                surveyId: currentSurvey().id,
                responses,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) throw new Error('Failed to save response');
        
        success('Thank you for completing the survey!');
        userResponses({});
        setTimeout(generateSurvey, 2000);
    } catch (err) {
        error('Failed to save response: ' + err.message);
    } finally {
        loading(false);
    }
}

// Handle response updates
function updateResponse(questionId, value) {
    const current = userResponses();
    userResponses({
        ...current,
        [questionId]: value
    });
}

// Render survey
effect(() => {
    const surveyEl = document.getElementById('survey');
    if (!surveyEl) return;

    const survey = currentSurvey();
    if (!survey) {
        surveyEl.replaceChildren(...html`<p>Loading survey...</p>`);
        return;
    }

    const responses = userResponses();
    const isLoading = loading();
    const errorMsg = error();
    const successMsg = success();

    surveyEl.replaceChildren(...html`
        <div class="survey-form">
            ${survey.questions.map(question => html`
                <div class="question">
                    <h3>${question.text}</h3>
                    <div class="options">
                        ${renderQuestionType(question, responses)}
                    </div>
                </div>
            `)}
            <button onclick=${submitSurvey} disabled=${isLoading}>
                ${isLoading ? 'Submitting...' : 'Submit Survey'}
            </button>
            ${errorMsg && html`<div class="error">${errorMsg}</div>`}
            ${successMsg && html`<div class="success">${successMsg}</div>`}
        </div>
    `);
});

// Render different question types
function renderQuestionType(question, responses) {
    switch (question.type) {
        case 'multiple_choice':
            return question.options.map(option => html`
                <label>
                    <input 
                        type="radio" 
                        name=${question.id}
                        value=${option}
                        checked=${responses[question.id] === option}
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
                >${responses[question.id] || ''}</textarea>
            `;
        
        case 'rating':
            return html`
                <select 
                    onchange=${e => updateResponse(question.id, e.target.value)}
                >
                    <option value="" selected=${!responses[question.id]}>Select rating</option>
                    ${Array.from({length: 5}, (_, i) => i + 1).map(num => html`
                        <option value=${num} selected=${responses[question.id] == num}>${num}</option>
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

// Generate initial survey
generateSurvey();