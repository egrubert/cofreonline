document.addEventListener('DOMContentLoaded', function() {
    // Verifica se existe o textarea do editor
    if (document.getElementById('myeditor')) {
        tinymce.init({
            selector: '#myeditor',
            height: 500,
            plugins: [
                'advlist autolink lists link image charmap print preview anchor',
                'searchreplace visualblocks code fullscreen',
                'insertdatetime media table paste code help wordcount'
            ],
            toolbar: 'undo redo | formatselect | bold italic backcolor | \
                     alignleft aligncenter alignright alignjustify | \
                     bullist numlist outdent indent | removeformat | help',
            skin_url: '/tinymce/skins/ui/oxide',
            content_css: '/tinymce/skins/content/default/content.css'
        });
    }
});