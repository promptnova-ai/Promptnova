// ── CLASIFICADOR AUTOMÁTICO DE PROMPTS ──
// Clasifica nuevos prompts según su contenido y palabras clave

const CATEGORY_KEYWORDS = {
  trabajo: [
    'email', 'presentación', 'reunión', 'propuesta', 'informe', 'entrevista',
    'currículum', 'cv', 'carrera', 'profesional', 'empresa', 'jefe', 'cliente',
    'negocios', 'negocio', 'laboral', 'empleo', 'contrato', 'salario'
  ],
  marketing: [
    'post', 'instagram', 'facebook', 'twitter', 'tiktok', 'viral', 'contenido',
    'caption', 'hashtag', 'anuncio', 'campaña', 'estrategia', 'audiencia',
    'leads', 'conversión', 'marca', 'social media', 'seo', 'publicidad'
  ],
  programacion: [
    'código', 'javascript', 'python', 'java', 'html', 'css', 'api', 'backend',
    'frontend', 'database', 'sql', 'función', 'debug', 'bug', 'desarrollo',
    'app', 'software', 'framework', 'librería', 'algoritmo', 'arquitectura'
  ],
  estudio: [
    'aprender', 'estudiante', 'profesor', 'clase', 'lección', 'concepto',
    'explica', 'entender', 'académico', 'examen', 'resumen', 'educación',
    'escuela', 'universidad', 'investigación', 'artículo', 'libro', 'teoría'
  ],
  personal: [
    'personal', 'desarrollo', 'vida', 'objetivo', 'meta', 'hábito', 'meditación',
    'estrés', 'ansiedad', 'motivación', 'confianza', 'autoestima', 'relación',
    'amor', 'familia', 'bienestar', 'salud', 'felicidad', 'productividad'
  ],
  emprendimiento: [
    'startup', 'negocio', 'empresa', 'idea', 'inversión', 'inversor', 'pitch',
    'elevator', 'modelo de negocio', 'viabilidad', 'emprendedor', 'mvp',
    'escalabilidad', 'financiamiento', 'capital', 'fondo'
  ]
};

/**
 * Clasifica automáticamente un prompt basado en su título y descripción
 * @param {string} title - Título del prompt
 * @param {string} description - Descripción del prompt
 * @returns {string} Categoría clasificada
 */
function classifyPrompt(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  // Contar coincidencias por categoría
  const scores = {};
  
  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    scores[category] = 0;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        // Peso mayor si está en el título
        const titleWeight = title.toLowerCase().includes(keyword.toLowerCase()) ? 2 : 1;
        scores[category] += matches.length * titleWeight;
      }
    });
  });
  
  // Retornar categoría con mayor puntuación
  const topCategory = Object.entries(scores).reduce((a, b) => 
    a[1] > b[1] ? a : b
  )[0];
  
  return scores[topCategory] > 0 ? topCategory : 'personal'; // Default: personal
}

/**
 * Genera un objeto de prompt automáticamente clasificado
 * @param {object} promptData - Datos del nuevo prompt
 * @returns {object} Prompt con categoría asignada automáticamente
 */
function createAutoClassifiedPrompt(promptData) {
  const {
    id,
    title,
    description,
    text,
    tools = ['ChatGPT', 'Claude']
  } = promptData;
  
  const category = classifyPrompt(title, description);
  
  return {
    id,
    cat: category,
    title,
    desc: description,
    text,
    tools
  };
}

/**
 * Añade un nuevo prompt a la lista, con clasificación automática
 * @param {object} promptData - Datos del nuevo prompt
 * @returns {object} Prompt añadido con categoría asignada
 */
function addAutoClassifiedPrompt(promptData) {
  const newPrompt = createAutoClassifiedPrompt(promptData);
  
  // La portada mantiene sus prompts en index.html; este resultado se usa en el panel.
  
  return newPrompt;
}

/**
 * Clasifica múltiples prompts de una sola vez
 * @param {array} promptsData - Array de prompts sin clasificar
 * @returns {array} Prompts clasificados automáticamente
 */
function batchClassifyPrompts(promptsData) {
  return promptsData.map(prompt => createAutoClassifiedPrompt(prompt));
}

// Exportar para usar en Node.js o módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    classifyPrompt,
    createAutoClassifiedPrompt,
    addAutoClassifiedPrompt,
    batchClassifyPrompts,
    CATEGORY_KEYWORDS
  };
}
