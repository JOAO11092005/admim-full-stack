import { db, collection, addDoc, getDocs } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const addCourseForm = document.getElementById('add-course-form');
    const addModuleForm = document.getElementById('add-module-form');
    const addLessonForm = document.getElementById('add-lesson-form');
    const moduleCourseSelect = document.getElementById('module-course');
    const lessonCourseSelect = document.getElementById('lesson-course');
    const lessonModuleSelect = document.getElementById('lesson-module');

    // Função para carregar os cursos no select de módulos e aulas
    async function loadCourses() {
        try {
            const coursesSnapshot = await getDocs(collection(db, 'cursos'));
            const coursesData = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Limpar as opções existentes
            moduleCourseSelect.innerHTML = '<option value="">Selecione um curso</option>';
            lessonCourseSelect.innerHTML = '<option value="">Selecione um curso</option>';

            coursesData.forEach(course => {
                const optionModule = document.createElement('option');
                optionModule.value = course.id;
                optionModule.textContent = course.titulo;
                moduleCourseSelect.appendChild(optionModule);

                const optionLessonCourse = document.createElement('option');
                optionLessonCourse.value = course.id;
                optionLessonCourse.textContent = course.titulo;
                lessonCourseSelect.appendChild(optionLessonCourse);
            });
        } catch (error) {
            console.error("Erro ao carregar cursos:", error);
            alert("Erro ao carregar a lista de cursos.");
        }
    }

    // Função para carregar os módulos de um curso no select de aulas
    async function loadModules(courseId) {
        if (!courseId) {
            lessonModuleSelect.innerHTML = '<option value="">Selecione um módulo</option>';
            return;
        }
        try {
            const modulesSnapshot = await getDocs(collection(db, `cursos/${courseId}/modulos`));
            const modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Limpar as opções existentes
            lessonModuleSelect.innerHTML = '<option value="">Selecione um módulo</option>';

            modulesData.forEach(module => {
                const optionLessonModule = document.createElement('option');
                optionLessonModule.value = module.id;
                optionLessonModule.textContent = module.titulo;
                lessonModuleSelect.appendChild(optionLessonModule);
            });
        } catch (error) {
            console.error("Erro ao carregar módulos:", error);
            alert("Erro ao carregar a lista de módulos.");
        }
    }

    // Carregar os cursos ao carregar a página
    loadCourses();

    // Event listener para carregar os módulos quando um curso é selecionado no formulário de aulas
    lessonCourseSelect.addEventListener('change', (event) => {
        const selectedCourseId = event.target.value;
        loadModules(selectedCourseId);
    });

    // Event listener para adicionar um novo curso
    addCourseForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const type = document.getElementById('course-type').value;
        const title = document.getElementById('course-title').value;
        const image = document.getElementById('course-image').value;

        try {
            await addDoc(collection(db, 'cursos'), {
                tipo: type,
                titulo: title,
                imagemUrl: image,
                criadoEm: new Date()
            });
            alert('Curso adicionado com sucesso!');
            addCourseForm.reset();
            loadCourses(); // Recarregar a lista de cursos nos selects
        } catch (error) {
            console.error("Erro ao adicionar curso:", error);
            alert("Erro ao adicionar o curso.");
        }
    });

    // Event listener para adicionar um novo módulo
    addModuleForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const courseId = moduleCourseSelect.value;
        const title = document.getElementById('module-title').value;
        const image = document.getElementById('module-image').value;

        if (!courseId) {
            alert('Por favor, selecione um curso para o módulo.');
            return;
        }

        try {
            await addDoc(collection(db, `cursos/${courseId}/modulos`), {
                titulo: title,
                imagemUrl: image,
                criadoEm: new Date()
            });
            alert('Módulo adicionado com sucesso!');
            addModuleForm.reset();
        } catch (error) {
            console.error("Erro ao adicionar módulo:", error);
            alert("Erro ao adicionar o módulo.");
        }
    });

    // Event listener para adicionar uma nova aula
    addLessonForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const courseId = lessonCourseSelect.value;
        const moduleId = lessonModuleSelect.value;
        const title = document.getElementById('lesson-title').value;
        const iframeUrl = document.getElementById('lesson-iframe-url').value;

        if (!courseId) {
            alert('Por favor, selecione um curso para a aula.');
            return;
        }
        if (!moduleId) {
            alert('Por favor, selecione um módulo para a aula.');
            return;
        }

        try {
            await addDoc(collection(db, `cursos/${courseId}/modulos/${moduleId}/aulas`), {
                titulo: title,
                iframeUrl: iframeUrl,
                criadoEm: new Date()
            });
            alert('Aula adicionada com sucesso!');
            addLessonForm.reset();
        } catch (error) {
            console.error("Erro ao adicionar aula:", error);
            alert("Erro ao adicionar a aula.");
        }
    });
});