async function main() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/clients/cmio435sx0002nzu90eugv1kp/magic-link')
        const text = await res.text()
        console.log('Status:', res.status)
        try {
            const json = JSON.parse(text)
            console.log('Body:', JSON.stringify(json, null, 2))
        } catch (e) {
            console.log('Body:', text)
        }
    } catch (error) {
        console.error('Fetch error:', error)
    }
}

main()
