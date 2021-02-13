const root = document.getElementById('root');

const newRecipe = {
    get() {
        return {
            name: this.name,
            image: this.image,
            compo: this.compo.map((el) => el.get()),
        }
    },
    get name() {
        return document.querySelector('#formNewRecipe input[name=name]').value;
    },
    get image() {
        return document.querySelector('#formNewRecipe input[name=image]').files[0];
    },
    get compo() {
        const compoContainer = document.getElementById('compo-container');

        return [...compoContainer.children].filter((child) => child.tagName !== 'TEMPLATE').map((el) => {
            return {
                get() {
                    return {
                        title: this.title,
                        ingredients: this.ingredients,
                        process: this.process,
                    }
                },
                get title() {
                    return el.querySelector('input.input-title').value;
                },
                get ingredients() {
                    return [...el.querySelectorAll('li.list-group-item[contenteditable=true]')].map((item) => item.innerText.trim()).filter((val) => val);
                },
                get process() {
                    return el.querySelector('textarea').value;
                },
            };
        });
    },
};

const viewsFunctions = {
    newRecipe() {
        const btnSubmit = document.getElementById('submit');
        btnSubmit.addEventListener('click', async () => {
            const res = await DB.post(newRecipe);
            console.log(res);
        });

        const inputFile = document.querySelector('input[type="file"][name="image"]');
        inputFile.addEventListener('input', ({ currentTarget: { files: [file] } }) => {
            if (!file.type.startsWith('image/')) {
                return;
            }

            if (file.size < 1048576) return;

            // On redimentionne l'image

            const canvas = document.createElement('canvas');
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 600;
            var width = img.width;
            var height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
        });

        const btnAddCompo = document.getElementById('btnAddCompo');
        btnAddCompo.addEventListener('click', () => {
            const compoTemplate = document.getElementById('compo-template');
            const compoContainer = document.getElementById('compo-container');

            const cloneTemplate = compoTemplate.content.cloneNode(true).firstElementChild;
            cloneTemplate.querySelector('ul.list-group>li.list-group-item.active').addEventListener('click', function () {
                const itemClone = document.getElementById('compo-list-item').content.cloneNode(true).firstElementChild;
                itemClone.addEventListener('keydown', (e) => {
                    if (e.keyCode === 13) {
                        e.currentTarget.blur();
                        e.preventDefault();
                    }
                });

                itemClone.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const textContent = e.clipboardData.getData('text');

                    const selection = getSelection();

                    if (!selection.rangeCount) return false;

                    selection.deleteFromDocument();
                    selection.getRangeAt(0).insertNode(document.createTextNode(textContent));
                    selection.collapseToEnd();
                });

                itemClone.addEventListener('contextmenu', (ev) => {
                    const contextMenu = document.getElementById('context-menu-list-item');
                    contextMenu.style.top = `${ev.pageY + 3}px`;
                    contextMenu.style.left = `${ev.pageX + 6}px`;
                    contextMenu.onclick = () => ev.target.remove();
                    contextMenu.classList.remove('d-none');

                    ev.preventDefault();
                })

                cloneTemplate.querySelector('ul.list-group').insertBefore(itemClone, this);
            });

            cloneTemplate.querySelector('button.btn-close').addEventListener('click', () => cloneTemplate.remove());

            compoContainer.append(cloneTemplate);
        });

        const contextMenu = document.getElementById('context-menu-list-item');
        document.addEventListener('click', (e) => {
            contextMenu.classList.add('d-none');
        });
    },
    allRecipes() {

    }
}

class DB {
    static dbAddress = 'https://database-d004.restdb.io';
    static key = '601154cd1346a1524ff12e9d';

    static async fetch(method = 'GET', url = '', body) {
        url = url || '';
        const fetchParams = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Cache-control': 'no-cache',
                'x-apikey': DB.key,
            },
        }

        if (body) fetchParams.body = body;
        const res = await fetch(DB.dbAddress + url, fetchParams);

        return await res.json();
    }

    static async get(_id) {
        return await DB.fetch('GET', '/rest/recipes' + (_id ? `/${_id}` : ''));
    }

    static async post(data) {
        if (!data) throw new Error('data cannot be empty');

        const { name, image, compo } = data;
        const creationDate = new Date();

        await DB.postMedia(image);
        return await DB.fetch('POST', '/rest/recipes', JSON.stringify({
            name,
            compo,
            creationDate,
        }));
    }

    static async postMedia(file) {
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file, file.name);
        return await DB.fetch('POST', '/media', formData);
    }
}

class Rooter {
    static async goto(path) {
        const res = await fetch(`./${path}`);
        const html = await res.text();

        root.innerHTML = html;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const navbarLinks = [...document.getElementById('navbar').getElementsByClassName('nav-link')];
    navbarLinks.forEach((el) => {
        el.addEventListener('click', async ({ currentTarget }) => {
            const path = currentTarget.getAttribute('data-path');
            await Rooter.goto(`${path}.html`);
            try {
                viewsFunctions[path]();
            } catch (e) { console.log(e) }

            navbarLinks.forEach((el) => el.classList.remove('active'));
            currentTarget.classList.add('active');
        });
    });

    navbarLinks[0].click();
});
