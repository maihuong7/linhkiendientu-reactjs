from flask import Flask, request, render_template, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import pandas as pd
import csv

app = Flask(__name__)


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response


@app.route('/api/recommend_product', methods=['POST'])
def get_recommendation():
    data = request.get_json()
    _id = data['_id']
    # recommendation = recommend_favourite(_id)
    # return  recommendation
    recommended_courses = recommend_favourite(_id)
    return (recommended_courses.to_dict('records'))
  

# Load dataframes
product_df = pd.read_csv('server/product.csv')
# product_data = pd.read_csv('server/product.csv')
favorite_df = pd.read_csv('server/file.csv')
# favorite_data = pd.read_csv('server/file.csv')


def similarity(text, keyword):
    vectorizer = TfidfVectorizer()
    vectors = vectorizer.fit_transform([text, keyword])
    similarity_score = cosine_similarity(vectors)[0, 1]
    return similarity_score


def recommend_favourite(_id):
    # Lấy tất cả sở thích của người dùng từ dataframe favorite_df
    print(_id)
    user_interests = favorite_df.loc[favorite_df['ID'] == _id, 'Interests'].iloc[0]

    # Tạo một dataframe rỗng để lưu trữ tất cả các sản phẩm có Atributive trùng với các sở thích của người dùng
    relevant_product = pd.DataFrame(columns=['ID','Name', 'Description', 'Atributive', 'similarity_score'])

    # Duyệt qua từng sở thích của người dùng
    for interest in  user_interests.split(','):
        # Lấy tất cả các sản phẩm có Atributive trùng với sở thích đó
        products = product_df.loc[product_df['Atributive'] == interest.strip()]

        # Tính toán điểm tương đồng giữa các sản phẩm và sở thích của người dùng
        similarity_scores = products['Atributive'].apply(lambda x: similarity(x, interest.strip()))

        # Thêm cột điểm tương đồng vào dataframe products
        products = products.assign(similarity_score=similarity_scores)

        # Thêm các sp vào dataframe relevant_product
        relevant_product = pd.concat([relevant_product, products], ignore_index=True)

    # Sắp xếp các khóa học theo thứ tự điểm tương đồng giảm dần
    relevant_product = relevant_product.sort_values(by='similarity_score', ascending=False).head(4)

    # Trả về danh sách các sp được đề xuất.
    return relevant_product[['ID', 'Images','Name', 'Slug', 'Price','Description']]


# Đọc dữ liệu từ file CSV
def read_csv_row(row_id):
    with open('file.csv', newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if row['ID'] == row_id:
                return row
        # Nếu không tìm thấy hàng, trả về None
        return None

# Route để trả về JSON của hàng có ID chỉ định
@app.route('/api/rows/<row_id>', methods=['GET'])
def get_row(row_id):
    row = read_csv_row(row_id)
    if row is not None:
        # Chuyển đổi dict thành JSON và trả về
        return jsonify(row)
    else:
        return jsonify({'message': 'Row not found'}), 404

@app.route("/")
def main():
    return "Welcome!"

if __name__ == '__main__':
    app.debug = True
    app.run()