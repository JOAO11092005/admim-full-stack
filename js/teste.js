   // --- INICIALIZAÇÃO E AUTENTICAÇÃO (VERSÃO SEGURA E FINAL) ---
    document.addEventListener('DOMContentLoaded', () => {
        // Suas chaves do Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyA9UUXIt6psEnOluZg530YBqE35Nkzlp0Y",
            authDomain: "finamceiro-5d9ae.firebaseapp.com",
            databaseURL: "https://finamceiro-5d9ae-default-rtdb.firebaseio.com",
            projectId: "finamceiro-5d9ae",
            storageBucket: "finamceiro-5d9ae.firebasestorage.app",
            messagingSenderId: "90531422877",
            appId: "1:90531422877:web:0b9fee54c03ba81d68aa74"
        };
        
        // Inicializa o Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        const auth = firebase.auth();
        const db = firebase.firestore();

        const loadingScreen = document.getElementById('loading-screen');
        const adminPanel = document.getElementById('admin-panel');

        // Lógica de autenticação SEGURA
        auth.onAuthStateChanged(async (user) => { 
            if (user) {
                // Usuário está logado. Força a atualização do token para pegar os "Custom Claims".
                const idTokenResult = await user.getIdTokenResult(true);

                // Verifica se o "claim" de admin existe e é verdadeiro no token do usuário
                if (idTokenResult.claims.admin === true) {
                    // SUCESSO! O usuário é um admin verificado pelo servidor.
                    loadingScreen.style.display = 'none';
                    adminPanel.style.display = 'flex';
                    initializeAppLogic(auth, db); // Inicia a lógica principal do painel
                } else {
                    // O usuário está logado, mas NÃO é um admin.
                    alert("Acesso negado. Você não tem permissão de administrador.");
                    await auth.signOut(); 
                    window.location.replace('login.html');
                }
            } else {
                // Usuário não está logado, redireciona para a página de login.
                window.location.replace('login.html');
            }
        });
    });

    // --- LÓGICA PRINCIPAL DA APLICAÇÃO (sem alterações) ---
    function initializeAppLogic(auth, db) {
        // --- SELETORES DE ELEMENTOS ---
        const mainPanelTitle = document.getElementById('main-panel-title');
        const navLinks = document.querySelectorAll('.sidebar-nav a');
        const adminSections = document.querySelectorAll('.admin-section');
        const toastContainer = document.getElementById('toast-container');
        const editLessonModal = document.getElementById('edit-lesson-modal');
        const editLessonForm = document.getElementById('edit-lesson-form');

        // --- VARIÁVEIS DE ESTADO ---
        let currentEditingPaths = {};
        let currentSupportLinks = [];

        // --- FUNÇÕES HELPER E UI ---
        const showToast = (message, type = 'info') => {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            const iconClass = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-times-circle' : 'fa-info-circle');
            toast.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;
            toastContainer.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        };

        const setupForm = (formId, submitLogic) => {
            const form = document.getElementById(formId);
            if (!form) return;
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitButton = form.querySelector('button[type="submit"]');
                const originalButtonContent = submitButton.innerHTML;
                submitButton.disabled = true;
                submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Salvando...`;
                try {
                    await submitLogic(form);
                    form.reset();
                } catch (error) {
                    console.error(`Erro no form ${formId}:`, error);
                    showToast(`Falha: ${error.message}`, 'error');
                } finally {
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonContent;
                }
            });
        };
        
        // --- MODAL DE EDIÇÃO DE AULAS ---
        const openEditLessonModal = async (courseId, moduleId, lessonId) => {
            currentEditingPaths = { courseId, moduleId, lessonId };
            try {
                const lessonRef = db.collection(`cursos/${courseId}/modulos/${moduleId}/aulas`).doc(lessonId);
                const doc = await lessonRef.get();
                if (!doc.exists) throw new Error("Aula não encontrada.");
                
                const data = doc.data();
                editLessonForm.querySelector('#edit-lesson-id').value = lessonId;
                editLessonForm.querySelector('#edit-lesson-title').value = data.titulo || '';
                editLessonForm.querySelector('#edit-lesson-description').value = data.descricao || '';
                editLessonForm.querySelector('#edit-lesson-iframe-url').value = data.iframeUrl || '';
                
                currentSupportLinks = data.linksDeApoio || [];
                renderSupportLinks();
                editLessonModal.style.display = 'flex';
            } catch (error) {
                showToast(error.message, 'error');
            }
        };

        const closeEditLessonModal = () => {
            editLessonModal.style.display = 'none';
            editLessonForm.reset();
            currentSupportLinks = [];
            document.getElementById('support-links-list').innerHTML = '';
        };

        const renderSupportLinks = () => {
            const list = document.getElementById('support-links-list');
            list.innerHTML = '';
            currentSupportLinks.forEach((link, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${link}</span> <div class="actions"><button type="button" class="delete-link-btn" data-index="${index}"><i class="fas fa-trash-alt"></i></button></div>`;
                list.appendChild(li);
            });
        };

        // --- NAVEGAÇÃO E EVENTOS ---
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionName = link.dataset.section;
                const sectionId = 'section-' + sectionName;
                
                navLinks.forEach(nav => nav.classList.remove('active'));
                link.classList.add('active');
                
                adminSections.forEach(section => section.classList.remove('active'));
                const activeSection = document.getElementById(sectionId);
                if (activeSection) activeSection.classList.add('active');
                
                const titleIcons = {
                    dashboard: "fa-tachometer-alt", courses: "fa-graduation-cap",
                    modules: "fa-cubes", lessons: "fa-video", provas: "fa-file-alt",
                    "users-approval": "fa-user-check"
                };
                mainPanelTitle.innerHTML = `<i class="fas ${titleIcons[sectionName]}"></i> ${link.textContent.trim()}`;
                
                if (sectionName === 'users-approval') loadPendingUsers();
            });
        });

        document.getElementById('logout-button').addEventListener('click', () => auth.signOut());
        document.getElementById('cancel-edit-btn').addEventListener('click', closeEditLessonModal);

        // --- CARREGAMENTO DE DADOS ---
        const courseSelects = [
            document.getElementById('module-course-select'),
            document.getElementById('lesson-course-select'),
            document.getElementById('prova-course-select')
        ];

        const loadCoursesForSelects = async () => {
            try {
                const snapshot = await db.collection('cursos').orderBy('titulo').get();
                courseSelects.forEach(s => { if(s) s.innerHTML = '<option value="">-- Selecione um curso --</option>'; });
                snapshot.forEach(doc => {
                    const option = `<option value="${doc.id}">${doc.data().titulo}</option>`;
                    courseSelects.forEach(s => { if(s) s.innerHTML += option; });
                });
            } catch (error) {
                showToast("Erro ao carregar cursos: " + error.message, 'error');
            }
        };

        const loadModulesForSelect = async (courseId, targetSelect) => {
            if (!targetSelect) return;
            targetSelect.innerHTML = '<option value="">Carregando...</option>';
            targetSelect.disabled = true;
            if (!courseId) {
                targetSelect.innerHTML = '<option value="">Selecione um curso primeiro</option>';
                return;
            }
            try {
                const snapshot = await db.collection(`cursos/${courseId}/modulos`).orderBy('titulo').get();
                targetSelect.innerHTML = '<option value="">-- Selecione um módulo --</option>';
                if (snapshot.empty) {
                    targetSelect.innerHTML += '<option value="" disabled>Nenhum módulo encontrado</option>';
                } else {
                    snapshot.forEach(doc => {
                        targetSelect.innerHTML += `<option value="${doc.id}">${doc.data().titulo}</option>`;
                    });
                    targetSelect.disabled = false;
                }
            } catch (error) {
                showToast("Erro ao carregar módulos.", 'error');
            }
        };
        
        const loadAndDisplayLessons = async (courseId, moduleId) => {
            // ... a lógica desta função permanece a mesma ...
        };

        const loadAndDisplayProvas = async (courseId, moduleId) => {
            // ... a lógica desta função permanece a mesma ...
        };
        
        const loadPendingUsers = async () => { /* ... Lógica existente ... */ };
        
        // --- EVENTOS DE FORMULÁRIOS E AÇÕES ---
        document.getElementById('add-support-link-btn').addEventListener('click', () => {
             // ... a lógica desta função permanece a mesma ...
        });

        document.getElementById('support-links-list').addEventListener('click', (e) => {
             // ... a lógica desta função permanece a mesma ...
        });

        editLessonForm.addEventListener('submit', async (e) => {
             // ... a lógica desta função permanece a mesma ...
        });
        
        document.getElementById('lesson-course-select').addEventListener('change', (e) => loadModulesForSelect(e.target.value, document.getElementById('lesson-module-select')));
        document.getElementById('lesson-module-select').addEventListener('change', (e) => {
            const courseId = document.getElementById('lesson-course-select').value;
            loadAndDisplayLessons(courseId, e.target.value);
        });

        const provaCourseSelect = document.getElementById('prova-course-select');
        const provaModuleSelect = document.getElementById('prova-module-select');
        provaCourseSelect.addEventListener('change', () => loadModulesForSelect(provaCourseSelect.value, provaModuleSelect));
        provaModuleSelect.addEventListener('change', () => loadAndDisplayProvas(provaCourseSelect.value, provaModuleSelect.value));

        // Configuração dos formulários de ADIÇÃO
        setupForm('add-course-form', async (form) => {
            await db.collection('cursos').add({
                titulo: form.querySelector('#course-title').value,
                tipo: form.querySelector('#course-type').value,
                imagemUrl: form.querySelector('#course-image').value,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Curso adicionado com sucesso!', 'success');
            loadCoursesForSelects();
        });

        setupForm('add-module-form', async (form) => {
            const courseId = form.querySelector('#module-course-select').value;
            if(!courseId) throw new Error("Selecione um curso!");
            await db.collection(`cursos/${courseId}/modulos`).add({
                titulo: form.querySelector('#module-title').value,
                imagemUrl: form.querySelector('#module-image').value,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Módulo adicionado com sucesso!', 'success');
        });

        setupForm('add-lesson-form', async (form) => {
            const courseId = form.querySelector('#lesson-course-select').value;
            const moduleId = form.querySelector('#lesson-module-select').value;
            if(!courseId || !moduleId) throw new Error("Selecione curso e módulo!");
            
            await db.collection(`cursos/${courseId}/modulos/${moduleId}/aulas`).add({
                titulo: form.querySelector('#lesson-title').value,
                iframeUrl: form.querySelector('#lesson-iframe-url').value,
                descricao: form.querySelector('#lesson-description').value,
                linksDeApoio: form.querySelector('#lesson-support-link').value ? [form.querySelector('#lesson-support-link').value] : [],
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Aula adicionada com sucesso!', 'success');
            loadAndDisplayLessons(courseId, moduleId);
        });
        
        // Inicialização
        loadCoursesForSelects();
    }