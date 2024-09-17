(function() {
    const WORDS_PER_PAGE = 400;
    let books = [];
    let specialOrderBooks = {};
    let optionsShown = {'show-chapter-titles': true};

    const $series = document.getElementById('series');
    $series.addEventListener('change', function(event) {
        event.preventDefault();
        
        const fileList = this.value.split(',');
        let promises = [];
        for (let i = 0; i < fileList.length; i++) {
            promises.push(fetch('./' + fileList[i] + '.json'));
        }
        Promise.all(promises)
            .then(responses => Promise.all(responses.map(r => r.json())))
            .then(seriesData => {
                bookData = [];
                for (let i = 0; i < seriesData.length; i++) {
                    bookData = bookData.concat(seriesData[i]);
                }
                loadBooks(bookData);
            })
    });
    $series.dispatchEvent(new Event('change'));

    function loadBooks(bookData) {
        books = bookData;
        const $bookList = document.getElementById('book-list');
        emptyElement($bookList);

        document.getElementById('schedule').style.display = 'none';

        for (let i in specialOrderBooks) {
            if (specialOrderBooks.hasOwnProperty(i)) {
                const $bookListContainer = document.getElementById('special-order-' + i + '-container');
                $bookListContainer.parentNode.removeChild($bookListContainer);
            }
        }
        specialOrderBooks = {};

        let pages = 0;
        optionsShown['show-chapter-titles'] = false;
        for (let i = 0; i < books.length; i++) {
            const id = 'book-' + i;
            const $li = document.createElement('li');

            books[i].wordsPerPage = books[i].words / books[i].pages;
            
            const $checkbox = document.createElement('input');
            $checkbox.type = 'checkbox';
            $checkbox.checked = true;
            $checkbox.id = id;
            $li.appendChild($checkbox);

            const $label = document.createElement('label');
            $label.htmlFor = id;
            $label.appendChild(document.createTextNode(books[i].title));
            $li.appendChild($label);

            $bookList.appendChild($li);
            pages += Math.round(books[i].words / WORDS_PER_PAGE);

            if (typeof books[i].ordering !== 'undefined') {
                addSpecialOrder(i);
            }

            if (!optionsShown['show-chapter-titles']) {
                for (let j = 0; j < books[i].chapters.length; j++) {
                    const chapter = books[i].chapters[j];
                    if (typeof chapter.title === 'string') {
                        optionsShown['show-chapter-titles'] = true;
                        break;
                    }
                }
            }
        }

        let showOptions = false;
        for (let name in optionsShown) {
            if (optionsShown.hasOwnProperty(name)) {
                const $option = document.getElementById('option-' + name);
                if (optionsShown[name]) {
                    showOptions = true;
                    $option.style.display = 'block';
                } else {
                    $option.style.display = 'none';
                }
            }
        }
        document.getElementById('options-container').style.display = showOptions ? 'block' : 'none';
    
        // Calculate days based on default pages per day value
        let days = Math.round(pages / document.getElementById('pages-per-day').value);
        setTargetDays(days);
        // TODO: Update the duration values whenever the selected one is changed
    }

    // TODO: Have this work even if multiple series are included
    function addSpecialOrder(bookNumber) {
        const book = books[bookNumber];

        const $bookListContainer = document.getElementById('book-list-container');

        const $container = document.createElement('div');
        $container.id = 'special-order-' + bookNumber + '-container';
        $container.classList.add('data-container');

        const $header = document.createElement('h2');
        $header.appendChild(document.createTextNode('Read ' + book.title + '\u2026'));
        $container.appendChild($header);

        const $list = document.createElement('ul');
        $container.appendChild($list);

        specialOrderBooks[bookNumber] = true;

        $bookListContainer.parentNode.insertBefore($container, $bookListContainer.nextSibling);

        for (let i = 0; i < book.ordering.length; i++) {
            const orderEntry = book.ordering[i];

            let text;
            let after = null;
            if (typeof orderEntry.first !== 'undefined' && orderEntry.first) {
                text = 'First';
                after = -1;
            } else if (typeof orderEntry.after !== undefined && books[orderEntry.after] !== 'undefined') {
                text = 'After ' + books[orderEntry.after].title;
                after = orderEntry.after;
            }
            if (typeof orderEntry.note === 'string') {
                text += ' (' + orderEntry.note + ')';
            }

            const id = 'special-order-' + bookNumber + '-' + i;
            const $li = document.createElement('li');
        
            const $radio = document.createElement('input');
            $radio.type = 'radio';
            $radio.value = after;
            $radio.name = 'special-order-' + bookNumber;
            $radio.id = id;

            if (typeof orderEntry.default !== 'undefined' && orderEntry.default) {
                $radio.checked = true;
            }

            $li.appendChild($radio);

            const $label = document.createElement('label');
            $label.htmlFor = id;
            $label.appendChild(document.createTextNode(text));
            $li.appendChild($label);

            $list.appendChild($li);
        }
    }

    function setTargetDays(days) {
        const $days = document.getElementById('days');
        $days.value = days;

        // Set target date value
        const today = new Date();
        setTargetDate(new Date(today.getTime() + days * 24 * 60 * 60 * 1000));
    }

    function setTargetDate(date) {
        const $day = document.getElementById('date-day');
        const $month = document.getElementById('date-month');
        const $year = document.getElementById('date-year');

        $day.value = date.getDate();
        $month.value = date.getMonth() + 1;
        $year.value = date.getFullYear();
    }

    let readingList = [];
    let showChapterTitles = false;

    const $createSchedule = document.getElementById('create-schedule');
    $createSchedule.addEventListener('click', function(event) {
        event.preventDefault();

        readingList = [];
        showChapterTitles = document.getElementById('show-chapter-titles').checked;

        for (let i in specialOrderBooks) {
            if (specialOrderBooks.hasOwnProperty(i)) {
                specialOrderBooks[i] = parseInt(document.querySelector('input[name="special-order-' + i + '"]:checked').value);
            }
        }

        for (let i = -1; i < books.length; i++) {
            if (i >= 0 && typeof books[i].ordering === 'undefined') {
                processBook(i);
            }
            for (let bookNumber in specialOrderBooks) {
                if (specialOrderBooks.hasOwnProperty(bookNumber) && specialOrderBooks[bookNumber] === i) {
                    processBook(bookNumber);
                }
            }
        }

        outputSchedule(processReadingList(readingList));
    });

    function processBook(bookNumber) {
        const book = books[bookNumber];
        const $includeBook = document.getElementById('book-' + bookNumber);
        if ($includeBook.checked) {
			for (let i = 0; i < book.chapters.length; i++) {
                const words = book.chapters[i].pages * book.wordsPerPage;
				readingList.push({
					book: book.title,
					chapter: book.chapters[i].chapter,
					title: book.chapters[i].title,
					pages: book.chapters[i].pages,
                    words: Math.round(words),
                    effectivePages: Math.round(words / WORDS_PER_PAGE),
				});
			}
		}
    }

	function processReadingList(readingList) {
		let effectivePages = 0;
		for (let i = 0; i < readingList.length; i++) {
			effectivePages += readingList[i].effectivePages;
		}
		let days = getDays(effectivePages);
		if (days < 1) {
			return;
		}

        let today = new Date();
		today = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
        today.setDate(today.getDate() + 1);
		
        const [weekdays, weightPerDay] = getWeekdays();

		let schedule = [];
		let readingToday = [];
		let pagesToday = 0;
		let variance = document.getElementById('variance').value / 100;

		let target = getTarget(effectivePages * weightPerDay, days, variance);
		reviseReadingList(readingList, target);

		for (let i = 0; i < readingList.length; i++) {
            while (weekdays[today.getDay()] <= 0) {
                today.setDate(today.getDate() + 1);
            }

            target = getTarget(effectivePages * weekdays[today.getDay()] / weightPerDay, days, variance);
			
			if (pagesToday + readingList[i].effectivePages < target.exact) {
				readingToday.push(readingList[i]);
				pagesToday += readingList[i].effectivePages;
			} else if (Math.abs(target.exact - pagesToday) > Math.abs(target.exact - (pagesToday + readingList[i].effectivePages)) || readingToday.length == 0) {
				readingToday.push(readingList[i]);
				pagesToday += readingList[i].effectivePages;
			} else {
				schedule.push({
                    weekday: today.toLocaleDateString('en-US', {weekday: 'long'}),
                    date: today.toLocaleDateString('en-US'),
                    content: readingToday,
                });
				readingToday = [readingList[i]];
				days -= weekdays[today.getDay()] / weightPerDay;
				effectivePages -= pagesToday;
				pagesToday = readingList[i].effectivePages;
                today.setDate(today.getDate() + 1);
			}
		}
		
		if (readingToday.length > 0) {
			schedule.push({
                weekday: today.toLocaleDateString('en-US', {weekday: 'long'}),
                date: today.toLocaleDateString('en-US'),
                content: readingToday,
            });
		}

		return schedule;
	}

    function reviseReadingList(readingList, target) {
        // TODO: Make this take into account weighted weekdays
		const maximum = target.maximum - target.minimum;
		for (let i = 0; i < readingList.length; i++) {
			if (readingList[i].effectivePages > maximum) {
				let parts = 2;
                const pageRatio = readingList[i].pages / readingList[i].effectivePages;
				while (Math.round(readingList[i].effectivePages / parts) > maximum) {
					parts++;
				}
				let partData = [];
				let pagesLeft = readingList[i].pages;
				for (let j = 0; j < parts; j++) {
					pages = Math.round(pagesLeft / (parts - j));
					pagesLeft -= pages;

                    const effectivePages = pages * pageRatio;
					partData.push({
						book: readingList[i].book,
						chapter: readingList[i].chapter,
						title: readingList[i].title + ' (part ' + (j + 1) + ')',
						book: readingList[i].book,
						pages: pages,
                        words: Math.round(effectivePages * WORDS_PER_PAGE),
                        effectivePages: Math.round(effectivePages),
						part: j + 1
					});
				}
				readingList.splice(i, 1);
				for (let j = partData.length - 1; j >= 0; j--) {
					readingList.splice(i, 0, partData[j]);
				}
			}
		}
	}

	function getTarget(pages, days, variance) {
		const target = Math.round(pages / days);
		const targetVariance = Math.round(target * variance);
		return {exact: target, minimum: target - targetVariance, maximum: target + targetVariance};
	}

	function getDays(pages) {
        const [weekdays, ] = getWeekdays();

        switch(document.querySelector('input[name=duration-type]:checked').value) {
			case 'pages-per-day':
				return Math.round(pages / document.getElementById('pages-per-day').value);
				
			case 'days':
                return parseInt(document.getElementById('days').value);
				
			case 'date':
				let today = new Date();
                today = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16);
				let date = new Date(document.getElementById('date-year').value, document.getElementById('date-month').value - 1, document.getElementById('date-day').value, 12);
				let weekday = date.getDay();
				let days = 0;
				while (date > today) {
					if (weekdays[weekday] > 0) {
						days++;
					}
					date -= 24 * 60 * 60 * 1000;
					weekday--;
					while (weekday < 0) {
						weekday += 7;
					}
				}
				return Math.ceil(days);
		}
	}

	function outputSchedule(schedule) {
        document.getElementById('schedule').style.display = 'block';
		let bookTitle = '';

        const $scheduleBody = document.getElementById('schedule-body');
        emptyElement($scheduleBody);
		for (let i = 0; i < schedule.length; i++) {
            const content = schedule[i].content;
			
            const $tr = document.createElement('tr');
            const $chapters = document.createElement('td');
            const $pages = document.createElement('td');

			for (let j = 0; j < content.length; j++) {
				if (content[j].book != bookTitle) {
                    const $bookHeaderDiv = document.createElement('div');
                    $bookHeaderDiv.classList.add('book-header');
                    $bookHeaderDiv.appendChild(document.createTextNode(content[j].book));
                    $chapters.appendChild($bookHeaderDiv);

                    const $pageSpacerDiv = document.createElement('div');
                    $pageSpacerDiv.appendChild(document.createTextNode('\u00A0')); // &nbsp;
                    $pages.appendChild($pageSpacerDiv);

                    bookTitle = content[j].book;
				}
				let text = content[j].chapter;
				if (showChapterTitles && typeof content[j].title === 'string') {
					text += ': ' + content[j].title;
				} else if (content[j].part) {
					text += ' (part ' + content[j].part + ')';
				}

                const $chapterDiv = document.createElement('div');
                $chapterDiv.appendChild(document.createTextNode(text));
                $chapters.appendChild($chapterDiv);

                const $pagesDiv = document.createElement('div');
                $pagesDiv.appendChild(document.createTextNode(content[j].pages));
                $pages.appendChild($pagesDiv);
			}

            const $date = document.createElement('td');

            const $weekdayDiv = document.createElement('div');
            $weekdayDiv.appendChild(document.createTextNode(schedule[i].weekday));
            $date.appendChild($weekdayDiv);

            const $dateDiv = document.createElement('div');
            $dateDiv.appendChild(document.createTextNode(schedule[i].date));
            $date.appendChild($dateDiv);

            $tr.appendChild($date);
            $tr.appendChild($chapters);
            $tr.appendChild($pages);

            $scheduleBody.appendChild($tr);
		}
	}

    function getWeekdays() {
        let weekdays = [];
        let totalWeight = 0;
        let countedDays = 0;
		for (let i = 0; i < 7; i++) {
            if (document.getElementById('day-' + i).checked) {
                const weekdayWeight = parseFloat(document.getElementById('day-' + i + '-weight').value);
                weekdays.push(weekdayWeight);
                if (weekdayWeight > 0) {
                    totalWeight += weekdayWeight;
                    countedDays++;
                }
            } else {
                weekdays.push(0);
            }
		}
        return [weekdays, totalWeight / countedDays];
    }

     function emptyElement($element) {
        while ($element.firstChild) {
            $element.removeChild($element.lastChild);
        }
    }
})();