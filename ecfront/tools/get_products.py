from bs4 import BeautifulSoup
import time
import datetime
import pandas as pd
import urllib
import urllib.parse
import urllib.error
import urllib.request
import requests
import random
import uuid

BASE_URL      = 'https://www.amazon.co.jp/'
BASE_SQL      = 'INSERT INTO PRODUCT_INFO (product_id, product_name, seller_id, stock, category, price, rate, comment, image_path ) VALUES ("%s","%s","%s",%d,%d,%d,%d,"%s","%s");'
BASE_IMG_PATH = './img/%s.jpg'
BASE_GCS_PATH = 'assets/img/go-portforio-apl-file/%s.jpg'
SQL_LIST_PATH = './productinsert.sql'
CATEGORY_DICT = {
    'digital-text'        : 2  ,
    'automotive'          : 99 ,
    'baby'                : 99 ,
    'beauty'              : 4  ,
    'apparel'             : 4  ,
    'fashion'             : 4  ,
    'computers'           : 3  ,
    'diy'                 : 99 ,
    'dvd'                 : 6  ,
    'food-beverage'       : 99 ,
    'gift-cards'          : 99 ,
    'hpc'                 : 5  ,
    'hobby'               : 99 ,
    'kitchen'             : 99 ,
    'industrial'          : 99 ,
    'books'               : 2  ,
    'jewelry'             : 99 ,
    'appliances'          : 3  ,
    'music'               : 7  ,
    'musical-instruments' : 7  ,
    'office-products'     : 99 ,
    'pet-supplies'        : 99 ,
    'instant-video'       : 6  ,
    'shoes'               : 8  ,
    'toys'                : 9  ,
    'videogames'          : 9  ,
    'watch'               : 3  ,
}

SELLER_LIST = [
    '483ece19-0a02-4cd1-bf74-0816e1020308',
    '33a64b8d-a4cd-4bfb-83f8-e587fe68bd7d',
    '6daac428-9d9a-454d-af17-3f0187e83593',
    '00946feb-77d0-4134-be0c-ada8a3860991',
    '22ab69a6-ee13-427e-a56e-5021bb407e20',
    '662f55f5-cc20-43e2-8389-81b2381bb061',
    '2867993f-503f-45ba-9cbc-8560999d7db8'
    ] 
 

def download_file( url, dst_path ):
    """
    Download an image file from designated site
    :type    url     : string
    :param   url     : URL
    :type    dst_path: string
    :param   dst_path: destination path    
    :rtype   bs4.BeautifulSoup
    :return: None
    """ 
    try:
        with urllib.request.urlopen( url ) as web_file:
            data = web_file.read()
            with open( dst_path, mode='wb' ) as local_file:
                local_file.write( data )
    except urllib.error.URLError as e:
        print( str( e ) )


def get_soap( url ):
    """
    Get Soup from designated site
    :type    url: string
    :param   url: URL
    :rtype   bs4.BeautifulSoup
    :return: Soup
    """   
    try:
        html = urllib.request.urlopen( url )
        soup = BeautifulSoup ( html, 'lxml' )
        time.sleep( 2 )
        return soup
    except Exception as e:
        print( str( e ) )
    
    
 
def get_info( ele, category_num ):
    """
    Get information from designated site
    :type    ele:          bs4.element.Tag
    :param   ele:          Soap Element
    :type    category_num: int
    :param   category_num: Category Number
    :return: None
    """ 
    try:
        """ decide local img path and gcs mount path """
        img_id     = str( uuid.uuid4() )
        img_path   = BASE_IMG_PATH %( img_id )
        gcs_path   = BASE_GCS_PATH %( img_id )
        """ download img file from designated url """
        img_url    = ele.find_all( 'img' )[0].attrs[ 'src' ]
        download_file( img_url, img_path )
        """ Prepare SQL input data """
        product_id = str( uuid.uuid4() )
        title      = ele.find_all( 'div', class_='p13n-sc-truncate' )[0].string.strip()
        seller_id  = random.choice( SELLER_LIST )
        stock      = random.randrange( 10, 100 )
        price      = int( int( ( ele.find( 'span', class_='p13n-sc-price' ).string.strip().lstrip( '¥' ) ).replace( ',', '' ))/10 ) 
        rate       = random.randrange( 1, 6 )
        insert_sql = BASE_SQL %( product_id, title, seller_id, stock, category_num, price, rate, title, gcs_path  )
        """ Write down Querys into the designated file """
        with open( SQL_LIST_PATH, 'a' ) as f:
            f.write( insert_sql )
    except Exception as e:
        print( str( e ) )            

if __name__ == '__main__':    
    for category_name, category_num in CATEGORY_DICT.items(): 
        for n in range( 1, 3 ):
            url = BASE_URL + '-/en/gp/bestsellers/' + category_name + '/ref=zg_bs_pg_2?ie=UTF8?pg=' + str( n )
            soup = get_soap( url )
            for ele in soup.find_all( 'li', class_='zg-item-immersion' ):
                get_info( ele, category_num )
                time.sleep( 0.5 )
        time.sleep( 3 ) 