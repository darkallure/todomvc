'use strict';

var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var test = require('selenium-webdriver/testing');
var Page = require('./page');
var PageLaxMode = require('./pageLaxMode');
var TestOperations = require('./testOperations');

module.exports.todoMVCTest = function (frameworkName, baseUrl, speedMode, laxMode, browserName) {

	test.describe('TodoMVC - ' + frameworkName, function () {

		var TODO_ITEM_ONE = 'buy some sausages';
		var TODO_ITEM_TWO = 'Сапог';
		var TODO_ITEM_THREE = 'Посетить врача';
		var browser, testOps, page;

		// a number of tests use this set of ToDo items.
		function createStandardItems(done) {
			page.enterItem(TODO_ITEM_ONE);
			page.enterItem(TODO_ITEM_TWO);
			return page.enterItem(TODO_ITEM_THREE)
				.then(function () {
					if (done instanceof Function) {
						done();
					}
				});
		}

		function launchBrowser(done) {
			var chromeOptions = new chrome.Options();
			chromeOptions.addArguments('no-sandbox');

			if (process.env.CHROME_PATH !== undefined) {
				chromeOptions.setChromeBinaryPath(process.env.CHROME_PATH);
			}

			browser = new webdriver.Builder()
				.withCapabilities({browserName: browserName})
				.setChromeOptions(chromeOptions)
				.build();

			browser.get(baseUrl);

			page = laxMode ? new PageLaxMode(browser) : new Page(browser);
			testOps = new TestOperations(page);

			return page.ensureAppIsVisibleAndLoaded()
				.then(function () {
					if (done instanceof Function) {
						done();
					}
				});
		}

		function printCapturedLogs() {
			var logs = browser.manage().logs();

			return logs.get('browser')
				.then(function (entries) {
					if (entries && entries.length) {
						console.log(entries);
					}
				});
		}

		function closeBrowser(done) {
			return browser
				.quit()
				.then(function () {
					if (done instanceof Function) { done(); }
				});
		}

		if (speedMode) {
			test.before(launchBrowser);
			test.after(closeBrowser);
			test.afterEach(function (done) {
				return browser.executeScript('window.localStorage && localStorage.clear(); location.reload(true);')
					.then(function () { done(); });
			});
		} else {
			test.beforeEach(launchBrowser);
			test.afterEach(function (done) {
				printCapturedLogs()
					.then(function () {
						return closeBrowser(done);
					});
			});
		}

		test.describe('Находясь на сайте, обновить страницу браузера', function () {

			test.it('Курсор мыши находиться в состоянии ввода в поле "What needs to be done?" ', function (done) {
				testOps.assertNewInputFocused()
					.then(function () { done(); });
			});

		});

		test.describe('Отсутвие в списке элементов', function () {

			test.it('скрытие элементов #main и #footer', function (done) {
				testOps.assertItemCount(0);
				testOps.assertMainSectionVisibility(false);
				testOps.assertFooterVisibility(false)
					.then(function () { done(); });
			});

		});

		test.describe('Ввести в поле ввода любое значение (слово, цифру и т.п.) и нажать на кноаку Enter', function () {

			test.it('Список элементов пополняется', function (done) {
				page.enterItem(TODO_ITEM_ONE);
				testOps.assertItems([TODO_ITEM_ONE]);
				page.enterItem(TODO_ITEM_TWO);
				testOps.assertItems([TODO_ITEM_ONE, TODO_ITEM_TWO])
					.then(function () { done(); });
			});

			test.it('Введенные данные стираются из основного поле ввода и добавляются к списку "todo"', function (done) {
				page.enterItem(TODO_ITEM_ONE);
				testOps.assertNewItemInputFieldText('')
					.then(function () { done(); });
			});

			test.it('Каждый последующий элемент добавляется в конец списка', function (done) {
				createStandardItems();
				testOps.assertItemCount(3);
				testOps.assertItemText(0, TODO_ITEM_ONE);
				testOps.assertItemText(1, TODO_ITEM_TWO);
				testOps.assertItemText(2, TODO_ITEM_THREE)
					.then(function () { done(); });
			});

			test.it('Если введены данные в поле ввода', function (done) {
				page.enterItem('   ' + TODO_ITEM_ONE + '  ');
				testOps.assertItemText(0, TODO_ITEM_ONE)
					.then(function () { done(); });
			});

			test.it('показ #main и #footer при добавлении новых элементов в список', function (done) {
				page.enterItem(TODO_ITEM_ONE);
				testOps.assertMainSectionVisibility(true);
				testOps.assertFooterVisibility(true)
					.then(function () { done(); });
			});

		});

		test.describe('Все элементы списка отмечены как "Завершенные"', function () {

			test.beforeEach(createStandardItems);

			test.it('возможность выборы всех завершенных элементов', function (done) {
				page.clickMarkAllCompletedCheckBox();
				testOps.assertItemCompletedStates([true, true, true])
					.then(function () { done(); });
			});

			test.it('правильно обновлять состояние complete all', function (done) {
				// manually check all items
				page.toggleItemAtIndex(0);
				page.toggleItemAtIndex(1);
				page.toggleItemAtIndex(2);

				// ensure checkall is in the correct state
				testOps.assertCompleteAllCheckedStatus(true)
					.then(function () { done(); });
			});

			test.it('возможность снятия галочек завершенности со всех элементов', function (done) {
				page.clickMarkAllCompletedCheckBox();
				page.clickMarkAllCompletedCheckBox();

				testOps.assertItemCompletedStates([false, false, false])
					.then(function () { done(); });
			});

			test.it('Кнопка complete all должна обновляться каждый раз когда элемент отмечен как completed или cleared', function (done) {
				page.clickMarkAllCompletedCheckBox();
				testOps.assertCompleteAllCheckedStatus(true);

				// all items are complete, now mark one as not-complete
				page.toggleItemAtIndex(0);
				testOps.assertCompleteAllCheckedStatus(false);

				// now mark as complete, so that once again all items are completed
				page.toggleItemAtIndex(0);
				testOps.assertCompleteAllCheckedStatus(true)
					.then(function () { done(); });
			});

		});

		test.describe('Элемент', function () {

			test.it('возможность отметить элемент как complete', function (done) {
				page.enterItem(TODO_ITEM_ONE);
				page.enterItem(TODO_ITEM_TWO);

				page.toggleItemAtIndex(0);
				testOps.assertItemCompletedStates([true, false]);

				page.toggleItemAtIndex(1);
				testOps.assertItemCompletedStates([true, true])
					.then(function () { done(); });
			});

			test.it('возможность убрать галочку с элемента с тем, чтобы убрать статус complete', function (done) {
				page.enterItem(TODO_ITEM_ONE);
				page.enterItem(TODO_ITEM_TWO);

				page.toggleItemAtIndex(0);
				testOps.assertItemCompletedStates([true, false]);

				page.toggleItemAtIndex(0);
				testOps.assertItemCompletedStates([false, false])
					.then(function () { done(); });
			});

		});

		test.describe('Editing', function () {

			test.beforeEach(function (done) {
				createStandardItems();
				page.doubleClickItemAtIndex(1)
					.then(function () { done(); });
			});

			test.it('делает поле ввода активным', function (done) {
				testOps.assertItemInputFocused();
				testOps.assertNewInputBlurred()	// Unnecessary? The HTML spec dictates that only one element can be focused.
					.then(function () { done(); });
			});

			test.it('скрытие дополнительных кнопок при редактировании', function (done) {
				testOps.assertItemToggleIsHidden(1);
				testOps.assertItemLabelIsHidden(1)
					.then(function () { done(); });
			});

			test.it('сохранение при нажа enter', function (done) {
				page.editItemAtIndex(1, 'buy some sausages' + webdriver.Key.ENTER);
				testOps.assertItems([TODO_ITEM_ONE, 'buy some sausages', TODO_ITEM_THREE])
					.then(function () { done(); });
			});

			test.it('сохранение при нажатии на область вне поля ввода', function (done) {
				page.editItemAtIndex(1, 'buy some sausages');
				// click a toggle button so that the blur() event is fired
				page.toggleItemAtIndex(0);
				testOps.assertItems([TODO_ITEM_ONE, 'buy some sausages', TODO_ITEM_THREE])
					.then(function () { done(); });
			});

			test.it('сокращает введенные данные', function (done) {
				page.editItemAtIndex(1, '    buy some sausages  ' + webdriver.Key.ENTER);
				testOps.assertItems([TODO_ITEM_ONE, 'buy some sausages', TODO_ITEM_THREE])
					.then(function () { done(); });
			});

			test.it('Удаление элемента при отсутвии вводимой информации в поле ввода', function (done) {
				page.editItemAtIndex(1, webdriver.Key.ENTER);
				testOps.assertItems([TODO_ITEM_ONE, TODO_ITEM_THREE])
					.then(function () { done(); });
			});

			test.it('Прекращение редактирования при нажатии на Escape', function (done) {
				page.editItemAtIndex(1, 'foo' + webdriver.Key.ESCAPE);
				testOps.assertItems([TODO_ITEM_ONE, TODO_ITEM_TWO, TODO_ITEM_THREE])
					.then(function () { done(); });
			});

		});

		test.describe('Counter', function () {

			test.it('должно показывать оставшееся количество элементов', function (done) {
				page.enterItem(TODO_ITEM_ONE);
				testOps.assertItemCountText('1 item left');
				page.enterItem(TODO_ITEM_TWO);
				testOps.assertItemCountText('2 items left')
					.then(function () { done(); });
			});

		});

		test.describe('Clear completed button', function () {

			test.beforeEach(createStandardItems);

			test.it('should display the correct text', function (done) {
				page.toggleItemAtIndex(1);
				testOps.assertClearCompleteButtonText('Clear completed')
					.then(function () { done(); });
			});

			test.it('should remove completed items when clicked', function (done) {
				page.toggleItemAtIndex(1);
				page.clickClearCompleteButton();
				testOps.assertItemCount(2);
				testOps.assertItems([TODO_ITEM_ONE, TODO_ITEM_THREE])
					.then(function () { done(); });
			});

			test.it('should be hidden when there are no items that are completed', function (done) {
				page.toggleItemAtIndex(1);
				testOps.assertClearCompleteButtonVisibility(true);
				page.clickClearCompleteButton();
				testOps.assertClearCompleteButtonVisibility(false)
					.then(function () { done(); });
			});

		});

		test.describe('Persistence', function () {

			test.it('should persist its data', function (done) {
				function stateTest() {
					testOps.assertItemCount(2);
					testOps.assertItems([TODO_ITEM_ONE, TODO_ITEM_TWO]);
					return testOps.assertItemCompletedStates([false, true]);
				}

				// set up state
				page.enterItem(TODO_ITEM_ONE);
				page.enterItem(TODO_ITEM_TWO);
				page.toggleItemAtIndex(1);
				stateTest();

				// navigate away and back again
				browser.get('about:blank');
				browser.get(baseUrl);

				// repeat the state test
				stateTest()
					.then(function () { done(); });
			});

		});

		test.describe('Routing', function () {

			test.beforeEach(createStandardItems);

			test.it('should allow me to display active items', function (done) {
				page.toggleItemAtIndex(1);
				page.filterByActiveItems();
				testOps.assertItems([TODO_ITEM_ONE, page.ITEM_HIDDEN_OR_REMOVED, TODO_ITEM_THREE])
					.then(function () { return done(); });
			});

			test.it('should respect the back button', function (done) {
				page.toggleItemAtIndex(1);
				page.filterByActiveItems();
				page.filterByCompletedItems();
				testOps.assertItems([page.ITEM_HIDDEN_OR_REMOVED, TODO_ITEM_TWO]); // should show completed items
				page.back(); // then active items
				testOps.assertItems([TODO_ITEM_ONE, page.ITEM_HIDDEN_OR_REMOVED, TODO_ITEM_THREE]);
				page.back(); // then all items
				testOps.assertItems([TODO_ITEM_ONE, TODO_ITEM_TWO, TODO_ITEM_THREE])
					.then(function () { done(); });
			});

			test.it('should allow me to display completed items', function (done) {
				page.toggleItemAtIndex(1);
				page.filterByCompletedItems();
				testOps.assertItems([page.ITEM_HIDDEN_OR_REMOVED, TODO_ITEM_TWO]);
				page.filterByAllItems() // TODO: why
					.then(function () { done(); });
			});

			test.it('should allow me to display all items', function (done) {
				page.toggleItemAtIndex(1);

				// apply the other filters first, before returning to the 'all' state
				page.filterByActiveItems();
				page.filterByCompletedItems();
				page.filterByAllItems();
				testOps.assertItems([TODO_ITEM_ONE, TODO_ITEM_TWO, TODO_ITEM_THREE])
					.then(function () { done(); });
			});

			test.it('should highlight the currently applied filter', function (done) {
				// initially 'all' should be selected
				testOps.assertFilterAtIndexIsSelected(0);
				page.filterByActiveItems();
				testOps.assertFilterAtIndexIsSelected(1);
				page.filterByCompletedItems();
				testOps.assertFilterAtIndexIsSelected(2)
					.then(function () { done(); });
			});

		});

	});

};
