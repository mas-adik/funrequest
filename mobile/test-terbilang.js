// Test terbilang function
function terbilang(num) {
    const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan'];
    const belasan = ['Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas',
        'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
    const puluhan = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
        'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh'];

    // Helper function yang tidak add "Rupiah" di akhir (untuk recursion)
    function terbilanHelper(n) {
        if (n === 0) return '';
        if (n < 10) return satuan[n];
        if (n < 20) return belasan[n - 10];
        if (n < 100) return puluhan[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + satuan[n % 10] : '');
        if (n < 1000) {
            const ratusan = Math.floor(n / 100);
            const sisa = n % 100;
            return (ratusan === 1 ? 'Seratus' : satuan[ratusan] + ' Ratus') + 
                   (sisa > 0 ? ' ' + terbilanHelper(sisa) : '');
        }
        if (n < 1000000) {
            const ribuan = Math.floor(n / 1000);
            const sisa = n % 1000;
            return (ribuan === 1 ? 'Seribu' : terbilanHelper(ribuan) + ' Ribu') +
                   (sisa > 0 ? ' ' + terbilanHelper(sisa) : '');
        }
        if (n < 1000000000) {
            const jutaan = Math.floor(n / 1000000);
            const sisa = n % 1000000;
            return terbilanHelper(jutaan) + ' Juta' +
                   (sisa > 0 ? ' ' + terbilanHelper(sisa) : '');
        }
        const miliaran = Math.floor(n / 1000000000);
        const sisa = n % 1000000000;
        return terbilanHelper(miliaran) + ' Miliar' +
               (sisa > 0 ? ' ' + terbilanHelper(sisa) : '');
    }

    num = Math.floor(Math.max(0, num));
    if (num === 0) return 'Nol';
    if (num < 0) return 'Minus ' + terbilang(-num);
    return terbilanHelper(num) + ' Rupiah';
}

// Test cases
const tests = [
    { input: 0, expected: 'Nol' },
    { input: 2, expected: 'Dua Rupiah' },
    { input: 10, expected: 'Sepuluh Rupiah' },
    { input: 15, expected: 'Lima Belas Rupiah' },
    { input: 100, expected: 'Seratus Rupiah' },
    { input: 1000, expected: 'Seribu Rupiah' },
    { input: 2000, expected: 'Dua Ribu Rupiah' },
    { input: 100000, expected: 'Seratus Ribu Rupiah' },
    { input: 1000000, expected: 'Satu Juta Rupiah' },
    { input: 2000000, expected: 'Dua Juta Rupiah' },
    { input: 2000001, expected: 'Dua Juta Satu Rupiah' },
];

console.log('Testing terbilang function:\n');
let passed = 0;
let failed = 0;

tests.forEach(test => {
    const result = terbilang(test.input);
    const isCorrect = result === test.expected;
    
    if (isCorrect) {
        console.log(`✅ ${test.input}: "${result}"`);
        passed++;
    } else {
        console.log(`❌ ${test.input}:`);
        console.log(`   Expected: "${test.expected}"`);
        console.log(`   Got:      "${result}"`);
        failed++;
    }
});

console.log(`\n${passed} passed, ${failed} failed`);
