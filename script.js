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
        const $day = document.getElementById('date-month');
        const $month = document.getElementById('date-day');
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
			for (var i = 0; i < book.chapters.length; i++) {
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
		var pages = 0;
		for (var i = 0; i < readingList.length; i++) {
			pages += readingList[i].pages;
		}
		days = getDays(pages);
		if (days < 1) {
			return;
		}
		
		let schedule = [];
		let today = [];
		let pagesToday = 0;
		let variance = document.getElementById('variance').value / 100;

		var target = getTarget(pages, days, variance);
		reviseReadingList(readingList, target);

		for (var i = 0; i < readingList.length; i++) {
			target = getTarget(pages, days, variance);
			
			if (pagesToday + readingList[i].pages < target.exact) {
				today.push(readingList[i]);
				pagesToday += readingList[i].pages;
			} else if (Math.abs(target.exact - pagesToday) > Math.abs(target.exact - (pagesToday + readingList[i].pages)) || today.length == 0) {
				today.push(readingList[i]);
				pagesToday += readingList[i].pages;
			} else {
				schedule.push(today);
				today = [readingList[i]];
				days--;
				pages -= pagesToday;
				pagesToday = readingList[i].pages;
			}
		}
		
		if (today.length > 0) {
			schedule.push(today);
		}

		return schedule;
	}

    function reviseReadingList(readingList, target) {
		var maximum = target.maximum - target.minimum;
		for (var i = 0; i < readingList.length; i++) {
			if (readingList[i].pages > maximum) {
				var parts = 2;
				while (Math.round(readingList[i].pages / parts) > maximum) {
					parts++;
				}
				var partData = [];
				var pagesLeft = readingList[i].pages;
				for (var j = 0; j < parts; j++) {
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
				for (var j = partData.length - 1; j >= 0; j--) {
					readingList.splice(i, 0, partData[j]);
				}
			}
		}
	}

	function getTarget(pages, days, variance) {
		var target = Math.round(pages / days);
		var targetVariance = Math.round(target * variance);
		return {exact: target, minimum: target - targetVariance, maximum: target + targetVariance};
	}

	function getDays(pages) {
		switch(document.querySelector('input[name=duration-type]:checked').value) {
			case 'pages-per-day':
				return Math.round(pages / document.getElementById('pages-per-day').value);
				
			case 'days':
                return parseInt(document.getElementById('days').value);
				
			case 'date':
				const weekdays = getWeekdays();
				let today = new Date();
                today = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16);
				let date = new Date(document.getElementById('date-year').value, document.getElementById('date-month').value - 1, document.getElementById('date-day').value, 12);
				let weekday = date.getDay();
				let days = 0;
				while (date > today) {
					if (weekdays[weekday]) {
						days++;
					}
					date -= 24 * 60 * 60 * 1000;
					weekday--;
					while (weekday < 0) {
						weekday += 7;
					}
				}
				return days;
		}
	}

	function outputSchedule(schedule) {
        const $schedule = document.getElementById('schedule');
        $schedule.style.visibility = 'visible';
		var bookTitle = '';
		var today = new Date();
		today = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
		today.setDate(today.getDate() + 1);
		
        const weekdays = getWeekdays();

        const $scheduleBody = document.getElementById('schedule-body');
        emptyElement($scheduleBody);
		for (var i = 0; i < schedule.length; i++) {
			while (!weekdays[today.getDay()]) {
				today.setDate(today.getDate() + 1);
			}
			
            const $tr = document.createElement('tr');
            const $chapters = document.createElement('td');
            const $pages = document.createElement('td');

			for (var j = 0; j < schedule[i].length; j++) {
				if (schedule[i][j].book != bookTitle) {
                    const $bookHeaderDiv = document.createElement('div');
                    $bookHeaderDiv.classList.add('book-header');
                    $bookHeaderDiv.appendChild(document.createTextNode(schedule[i][j].book));
                    $chapters.appendChild($bookHeaderDiv);

                    const $pageSpacerDiv = document.createElement('div');
                    $pageSpacerDiv.appendChild(document.createTextNode('\u00A0')); // &nbsp;
                    $pages.appendChild($pageSpacerDiv);

                    bookTitle = schedule[i][j].book;
				}
				let text = schedule[i][j].chapter;
				if (showChapterTitles) {
					text += ': ' + schedule[i][j].title;
				} else if (schedule[i][j].part) {
					text += ' (part ' + schedule[i][j].part + ')';
				}

                const $chapterDiv = document.createElement('div');
                $chapterDiv.appendChild(document.createTextNode(text));
                $chapters.appendChild($chapterDiv);

                const $pagesDiv = document.createElement('div');
                $pagesDiv.appendChild(document.createTextNode(schedule[i][j].pages));
                $pages.appendChild($pagesDiv);
			}

            const $date = document.createElement('td');
            $date.appendChild(document.createTextNode(today.toLocaleDateString()));

            $tr.appendChild($date);
            $tr.appendChild($chapters);
            $tr.appendChild($pages);

            $scheduleBody.appendChild($tr);

			today.setDate(today.getDate() + 1);
		}
	}

    function getWeekdays() {
        var weekdays = [];
		for (var i = 0; i < 7; i++) {
			weekdays.push(document.getElementById('day-' + i).checked);
		}
        return weekdays;
    }

     function emptyElement($element) {
        while ($element.firstChild) {
            $element.removeChild($element.lastChild);
        }
    }
})();