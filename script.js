(function() {
	let seriesName = 'wheel-of-time';
    let books = [];

    fetch('./' + seriesName + '.json')
        .then(response => response.json())
        .then(bookData => {
            books = bookData;
            const $bookList = document.getElementById('book-list');
            
            let pages = 0;
            for (let i = 0; i < books.length; i++) {
                const id = 'book-' + i;
                const $li = document.createElement('li');
                
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
                pages += books[i].pages;

                addNewSpringEntry(books[i], i);
            }
        
            // Calculate days based on default pages per day value
            let days = Math.round(pages / document.getElementById('pages-per-day').value);
            setTargetDays(days);
        });

    function addNewSpringEntry(book, i) {
        const $newSpringList = document.getElementById('new-spring-list');
        const id = 'new-spring-' + i;
        const $li = document.createElement('li');
        
        const $radio = document.createElement('input');
        $radio.type = 'radio';
        $radio.value = i;
        $radio.name = 'new-spring';
        $radio.id = id;

        let text;
        if (i > 0) {
            text = 'After ' + book.title;
            if (book.newSpring) {
                text += ' (' + book.newSpring + ')';
            }
        } else {
            text = 'First (chronological)';
            $radio.checked = true;
        }

        $li.appendChild($radio);

        const $label = document.createElement('label');
        $label.htmlFor = id;
        $label.appendChild(document.createTextNode(text));
        $li.appendChild($label);

        $newSpringList.appendChild($li);
    }

    function setTargetDays(days) {
        const $days = document.getElementById('days');
        $days.value = days;

        // Set target date value
        const today = new Date();
        setTargetDate(new Date(today.getTime() + days * 24 * 60 * 60 * 1000));
    }

    function setTargetDate(date) {
        console.log(date);
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
        const newSpringPosition = document.querySelector('input[name="new-spring"]:checked').value;

        if (newSpringPosition == 0) {
            processBook(0);
        }
        for (let i = 1; i < books.length; i++) {
            processBook(i);

            if (i == newSpringPosition) {
                processBook(0);
            }
        }

        outputSchedule(processReadingList(readingList));
    });

    function processBook(bookNumber) {
        const book = books[bookNumber];
        const $includeBook = document.getElementById('book-' + bookNumber);
        if ($includeBook.checked) {
			for (let i = 0; i < book.chapters.length; i++) {
				readingList.push({
					book: book.title,
					chapter: book.chapters[i].chapter,
					title: book.chapters[i].title,
					pages: book.chapters[i].pages
				});
			}
		}
    }

	function processReadingList(readingList) {
		let pages = 0;
		for (let i = 0; i < readingList.length; i++) {
			pages += readingList[i].pages;
		}
		days = getDays(pages);
		if (days < 1) {
			return;
		}

        let today = new Date();
		today = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
        today.setDate(today.getDate() + 1);
		
        const [weekdays, ] = getWeekdays();

		let schedule = [];
		let readingToday = [];
		let pagesToday = 0;
		let variance = document.getElementById('variance').value / 100;

		let target = getTarget(pages, days, variance);
		reviseReadingList(readingList, target);

		for (let i = 0; i < readingList.length; i++) {
            while (weekdays[today.getDay()] <= 0) {
                today.setDate(today.getDate() + 1);
            }

            target = getTarget(pages * weekdays[today.getDay()], days, variance);
			
			if (pagesToday + readingList[i].pages < target.exact) {
				readingToday.push(readingList[i]);
				pagesToday += readingList[i].pages;
			} else if (Math.abs(target.exact - pagesToday) > Math.abs(target.exact - (pagesToday + readingList[i].pages)) || readingToday.length == 0) {
				readingToday.push(readingList[i]);
				pagesToday += readingList[i].pages;
			} else {
				schedule.push({
                    weekday: today.toLocaleDateString('en-US', {weekday: 'long'}),
                    date: today.toLocaleDateString('en-US'),
                    content: readingToday,
                });
				readingToday = [readingList[i]];
				days--;
				pages -= pagesToday;
				pagesToday = readingList[i].pages;
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
			if (readingList[i].pages > maximum) {
				let parts = 2;
				while (Math.round(readingList[i].pages / parts) > maximum) {
					parts++;
				}
				let partData = [];
				let pagesLeft = readingList[i].pages;
				for (let j = 0; j < parts; j++) {
					pages = Math.round(pagesLeft / (parts - j));
					pagesLeft -= pages;
					partData.push({
						book: readingList[i].book,
						chapter: readingList[i].chapter,
						title: readingList[i].title + ' (part ' + (j + 1) + ')',
						book: readingList[i].book,
						pages: pages,
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
        const [weekdays, weightPerDay] = getWeekdays();
        console.log(weightPerDay);

        switch(document.querySelector('input[name=duration-type]:checked').value) {
			case 'pages-per-day':
				return Math.round(pages / document.getElementById('pages-per-day').value / weightPerDay);
				
			case 'days':
                return parseInt(document.getElementById('days').value / weightPerDay);
				
			case 'date':
				let today = new Date();
                today = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16);
				let date = new Date(document.getElementById('date-year').value, document.getElementById('date-month').value - 1, document.getElementById('date-day').value, 12);
				let weekday = date.getDay();
				let days = 0;
				while (date > today) {
					if (weekdays[weekday]) {
						days += weekdays[weekday];
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
        const $schedule = document.getElementById('schedule');
        $schedule.style.visibility = 'visible';
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
				if (showChapterTitles) {
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