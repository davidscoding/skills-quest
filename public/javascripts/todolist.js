// Revised

document.addEventListener("DOMContentLoaded", () => {
  const todolist = {

  // Setup
    
    async init() {
      try {
        // reset database
        // await this.getReset();

        // Properties
        this.groups = null;
        this.elements = null;
        this.parents = null;
        this.currentSection = null;
        this.listItem = null;
        this.modalId = null;

        // handlebars
        this.compileTemplates();
        this.registerPartials();

        // render base layout
        this.renderLayout();

        // event listeners
        this.domElements();
        this.bindEventListeners();

        // load the page
        await this.loadPage();
        
        // Templates
        this.compileTemplates();
        this.registerPartials(); 
      } catch(error) {
        alert(`There was an error: ${error}`);
      }
    },

    renderLayout() {
      this.layout = document.createElement('div');
      this.layout.innerHTML = this.templates.main();
      document.querySelector('body').appendChild(this.layout);
    },

  // Page Loading

    async loadPage(titleCompleted) {
      this.hideModal();
      let todos = await this.getTodos();
      this.parseData(todos);
      this.setCurrentSection(titleCompleted);
      this.render();
    },
    
    render() {
      this.parents.title.innerHTML = this.templates.title({'current_section': this.currentSection});
      this.parents.list.innerHTML = this.templates.list({'selected': this.currentSection.todos});
      this.parents.allTodos.innerHTML = this.templates.allTodos({'todos': this.groups.allTodos});
      this.parents.allLists.innerHTML = this.templates.allLists({'todos_by_date': this.groups.allTodosDates});
      this.parents.completedTodos.innerHTML = this.templates.completedTodos({'done': this.groups.completed});
      this.parents.completedLists.innerHTML = this.templates.completedLists({'done_todos_by_date': this.groups.completedDates});
      if (this.currentSection.completed) {
        let current = document.querySelector(`#completed_items [data-title='${this.currentSection.title}']`);
        if (current) current.classList.add('active');
      } else {
        let current = document.querySelector(`#all [data-title='${this.currentSection.title}']`);
        if (current) current.classList.add('active');
      }
    },

    setCurrentSection(titleCompleted) {
      titleCompleted = titleCompleted || {title: 'All Skills', completed: false};
      this.currentSection = titleCompleted;
      let title = this.currentSection.title;
      let completed = this.currentSection.completed;
      
      if (title === 'All Skills'){
        this.currentSection.todos = this.groups['allTodos'];
      } else if (title === 'Completed') {
        this.currentSection.todos = this.groups['completed'];
      } else if (completed) {
        this.currentSection.todos = this.groups.completedDates[title] || [];
      } else {
        this.currentSection.todos = this.groups.allTodosDates[title] || [];
      }

      this.currentSection.data = this.currentSection.todos.length;
    },

  // Identifying Elements and Adding Event Listeners

    domElements() {
      
      // Template Insertion Parents
      
      this.parents = {};
      this.parents.allTodos = document.querySelector('#all_todos');
      this.parents.allLists = document.querySelector('#all_lists');
      this.parents.completedTodos = document.querySelector('#completed_todos');
      this.parents.completedLists = document.querySelector('#completed_lists');
      this.parents.title = document.querySelector('#items header');
      this.parents.list = document.querySelector('#items tbody');

      // Additional Key Elements

      this.elements = {};
      this.elements.formModal = document.querySelector('#form_modal');
      this.elements.newItem = document.querySelector('label[for="new_item"]');
      this.elements.modalLayer = document.querySelector('#modal_layer');
      this.elements.form = this.elements.formModal.querySelector('form');
      this.elements.formButton = this.elements.form.querySelector('button'); 
    },

    bindEventListeners() {
      this.parents.allTodos.addEventListener('click', this.showAllTodos.bind(this));
      this.parents.allLists.addEventListener('click', this.showAllList.bind(this));
      this.parents.completedTodos.addEventListener('click', this.showCompletedTodos.bind(this));
      this.parents.completedLists.addEventListener('click', this.showCompletedList.bind(this));
      this.parents.list.addEventListener('click', this.listAction.bind(this), true);
      
      this.elements.newItem.addEventListener('click', this.showModal.bind(this));
      this.elements.modalLayer.addEventListener('click', this.hideModal.bind(this));
      this.elements.form.addEventListener('submit', this.submitForm.bind(this));
      this.elements.formButton.addEventListener('click', this.markForm.bind(this));  
    },

  // Show Section Callbacks
    
    async showAllTodos(event) {
      await this.loadPage();
    },

    async showAllList(event) {
      let title = this.findParentWithSelector(event.target, '[data-title]').dataset.title;
      let titleCompleted = {title: title, completed: false};
      await this.loadPage(titleCompleted);
    },

    async showCompletedTodos(event) {
      let titleCompleted = {title: 'Completed', completed: true};
      await this.loadPage(titleCompleted);
    },

    async showCompletedList(event) {
      let title = this.findParentWithSelector(event.target, '[data-title]').dataset.title;
      let titleCompleted = {title: title, completed: true};
      await this.loadPage(titleCompleted);
    },

  // Todo Item Callbacks

    async listAction(event) {
      this.processListTarget(event);
      
      if (this.listItem.clicked.tagName === 'LABEL') {
        await this.showModal();
      } else if (this.listItem.subsection.classList.contains('delete')) {
        await this.deleteTodo();
        await this.loadPage(this.currentSection);
      } else {
        let completed = !(this.currentTodoJSON().completed);
        await this.markTodo(completed);
      }    
    },

    async submitForm(event) {
      event.preventDefault();
      let data = this.formToJson(this.elements.form);
      
      if (data.title.length < 3) {
        alert('You must enter a title at least 3 characters long.')
        return;
      }
      
      if (this.modalId === null) {   
        await this.postTodo(data);
        await this.loadPage();
      } else {
        await this.putTodo.bind(this)(data);
        await this.loadPage(this.currentSection);
      }
    },

    async markForm(event) {
      event.preventDefault();
      event.stopPropagation();
      
      if (!this.modalId) {
        alert('Cannot mark as complete as item has not been created yet!');
        return;
      } else {
        await this.markTodo(true);
      }
    },

  // Todo Callback Helpers

    processListTarget(event) {
      event.preventDefault();
      event.stopPropagation();
      
      this.listItem = {};
      this.listItem.clicked = event.target;
      this.listItem.subsection = this.findParentWithSelector(this.listItem.clicked, 'td');
      this.modalId = this.findParentWithSelector(this.listItem.clicked, 'tr').dataset.id;
    },

    currentTodoJSON() {
      let json = {...this.groups.allTodos.filter((todo) => {
        return Number(this.modalId) === todo.id;
      })[0]};
      delete json['due_date'];
      return json;
    },

    formToJson(formElement) {
      const formData = new FormData(formElement);
      const jsonData = {};
    
      formData.forEach((value, key) => {
        if (key.slice(0, 4) === 'due_') {
          key = key.slice(4);
        }

        // if (key === 'description' && value === '') {
          // value = ' ';
        // }
        
        jsonData[key] = value;
      });

      return jsonData;
    },

    findParentWithSelector(element, selector) {
      while (element && !element.matches(selector)) {
        element = element.parentElement;
      }
  
      return element;
    },

    async markTodo(completed) {
      await this.putTodo({completed: completed});
      await this.loadPage(this.currentSection);
    },

  // API Requests

    async getTodos() {
      try {
        let response = await fetch(`/api/todos`);
        let todos = await response.json();
        return todos;
      } catch (error) {
        alert(`Error loading the todos list: ${error}`);
      };
    },
    
    async getTodo() {
      try {
        let response = await fetch(`/api/todos/${this.modalId}`);
        let todo = await response.json();
        return todo;
      } catch (error) {
        alert(`Error loading todo with id ${this.modalId}: ${error}`);
      };
    },

    async deleteTodo() {
      try {
        let response = await fetch(`/api/todos/${this.modalId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        alert(`Error deleting todo with id ${this.modalId}: ${error}`);
      };
    },

    async putTodo(data) {
      try {
        await fetch(`/api/todos/${this.modalId}`, {
          method: 'PUT',
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      } catch (error) {
        alert(`Error updating todo with id ${this.modalId}: ${error}`);
      };
    },

    async postTodo(data) {
      try {
        await fetch('/api/todos', {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      } catch(error) {
        alert(`Error uploading todo with id ${this.modalId}: ${error}`);
      };
    },

    async getReset() {
      try {
        await fetch('/api/reset');
      } catch(error) {
        alert(`Error resetting database: ${error}`);
      }
    },

  // Toggle Modal

    async showModal() {
      this.elements.formModal.style.top = '300px';
      this.elements.modalLayer.style.display = 'block';
      this.elements.formModal.style.display = 'block';
      await this.retreiveModalForm();
    },
    
    hideModal() {
      this.elements.modalLayer.style.display = 'none';
      this.elements.formModal.style.display = 'none';
      this.modalId = null;
      this.resetModalForm();
    },

    async retreiveModalForm() {
      if (!this.modalId) {
        this.elements.form.querySelector('#due_day').value = "00";
        this.elements.form.querySelector('#due_month').value = "00";
        this.elements.form.querySelector('#due_year').value = "0000";
        return;
      } else {
        let data = await this.getTodo();
        // if (data.description === ' ') {
        //   data.description = '';
        // }
        this.elements.form.title.value = data.title;
        this.elements.form.querySelector('#due_day').value = data.day || "00";
        this.elements.form.querySelector('#due_month').value = data.month || "00";
        this.elements.form.querySelector('#due_year').value = data.year || "0000";
        this.elements.form.querySelector('textarea').value = data.description || "";
      }
    },

    resetModalForm() {
      this.elements.form.title.value = '';
      this.elements.form.querySelector('#due_day').value = '00';
      this.elements.form.querySelector('#due_month').value = '0000';
      this.elements.form.querySelector('#due_year').value = '0000';
      this.elements.form.querySelector('textarea').value = '';
    },

  // Group Data
    
    parseData(todos) {
      this.groups = {};
      let dueDateTodos = this.addDueDates(todos);
      this.groups.allTodos = this.sortByCompleted(dueDateTodos);
      this.groups.completed = dueDateTodos.filter(({completed}) => completed);
      this.groups.allTodosDates = this.groupDates(this.groups.allTodos);
      this.groups.completedDates = this.groupDates(this.groups.completed);
      
    },

  // Sort On Dates

    addDueDates(todos) {
      return todos.map((todo) => {
        if (!Number(todo.month) || !Number(todo.year)) {
          todo['due_date'] = 'No Due Date';
        } else {
          todo['due_date'] = todo['month'] + '/' + todo['year'].slice(2);
        }
        return todo;
      });
    },

    groupDates(todos) {
      let groups = this.splitByDates(todos);
      let sortedDateList = Object.keys(groups).sort(this.compareDates.bind(this));
      let sortedGroupDates = {};
      sortedDateList.forEach((date) => {
        sortedGroupDates[date] = groups[date];
      });
      return sortedGroupDates;
    },

    splitByDates(todos) {
      return todos.reduce((dateGroups, todo) => {
        let date = todo['due_date'];

        let todos = (dateGroups[date] ? dateGroups[date].concat(todo) : [todo]);
        dateGroups[date] = todos;
        
        return dateGroups;
      }, {});
    },

    compareDates(date1, date2) {
      if (date1 === 'No Due Date') {
        return -1;
      } else if (date2 === 'No Due Date') {
        return 1;
      } else {
        return this.comparisonDate(date1) - this.comparisonDate(date2);
      }
    },
    
    comparisonDate(date) {
      return Number(date.slice(3) + date.slice(0,2));
    },

  // Sort On Completion
    
    sortByCompleted(todos) {
      return this.partitionArray(todos, this.isNotCompleted).flat();
    },

    partitionArray(arr, condition) {
    return arr.reduce((result, current) => {
      if (condition(current)) {
        result[0].push(current);
      } else {
        result[1].push(current);
      }
        return result;
      }, [[], []]);
    },

    isNotCompleted(todo) {
      return !todo.completed;
    },

  // Templates
    
    compileTemplates() {
      this.templates = {};
      this.templates.main = Handlebars.compile($('#main_template').html());
      this.templates.allTodos = Handlebars.compile($('#all_todos_template').html());
      this.templates.allLists = Handlebars.compile($('#all_list_template').html());
      this.templates.completedTodos = Handlebars.compile($('#completed_todos_template').html());
      this.templates.completedLists = Handlebars.compile($('#completed_list_template').html());
      this.templates.title = Handlebars.compile($('#title_template').html());
      this.templates.list = Handlebars.compile($('#list_template').html());
    },

    registerPartials() {
      Handlebars.registerPartial('all_todos_template', $('#all_todos_template').html());
      Handlebars.registerPartial('all_list_template', $('#all_list_template').html());
      Handlebars.registerPartial('completed_todos_template', $('#completed_todos_template').html());
      Handlebars.registerPartial('completed_list_template', $('#completed_list_template').html());
      Handlebars.registerPartial('title_template', $('#title_template').html());
      Handlebars.registerPartial('list_template', $('#list_template').html());
      Handlebars.registerPartial('item_partial', $('#item_partial').html());
    },
  
  }

  todolist.init();
});

